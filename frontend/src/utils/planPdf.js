import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatNumber } from './format';

/**
 * Download a cut & weld plan PDF for a given analysis.
 * Pictorial representation: bars per source pipe (green used, red remainder),
 * plus a detailed table that matches the CSV export.
 */
export function downloadCutWeldPlanPdf({ recipient, analysis, planRows, filenamePrefix }) {
  const safePrefix = (filenamePrefix || recipient || 'order').toString().trim().replace(/\s+/g, '_');
  const title = `${recipient || 'Order'} — Cut & Weld Plan`;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFontSize(14);
  doc.text(title, 40, 34);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Recipient: ${recipient || '—'}`, 40, 52);
  doc.setTextColor(0);

  const head = [
    [
      'Req #',
      'Required',
      'Action',
      'Piece #',
      'Segment (mm)',
      'Source (mm)',
      'Remainder (mm)',
      'Supplier',
      'Notes',
    ],
  ];
  const body = (planRows || []).map((r) => [
    r.requirement_no ?? '',
    r.required_dimensions ?? '',
    r.action ?? '',
    r.piece_no ?? '',
    r.segment_length_mm === '' ? '—' : String(r.segment_length_mm),
    r.source_pipe_length_mm === '' ? '—' : String(r.source_pipe_length_mm),
    r.remainder_mm === '' ? '—' : String(r.remainder_mm),
    r.supplier ?? '',
    r.notes ?? '',
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 70,
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 120 },
      2: { cellWidth: 55 },
      3: { cellWidth: 45 },
      4: { cellWidth: 80, halign: 'right' },
      5: { cellWidth: 75, halign: 'right' },
      6: { cellWidth: 85, halign: 'right' },
      7: { cellWidth: 90 },
      8: { cellWidth: 220 },
    },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 580);
      doc.setTextColor(0);
    },
  });

  // Pictorial visual section: bars for each source pipe
  const pageHeight = doc.internal.pageSize.getHeight();
  // eslint-disable-next-line no-underscore-dangle
  const lastTable = doc.lastAutoTable || doc.__autoTable; // defensive for different versions
  const tableY = (lastTable && lastTable.finalY) || 80;
  let y = tableY + 28;

  doc.setFontSize(11);
  doc.text('Visual plan (bars = source pipes; green = used, red = remainder)', 40, y);
  y += 16;
  doc.setFontSize(9);

  const maxBarWidth = 520;
  const barHeight = 10;

  (analysis || []).forEach((block, idx) => {
    if (!block) return;
    const req = block.requirement || {};
    const reqLabel = `${formatNumber(req.length)} × ${formatNumber(req.width)} × ${formatNumber(
      req.height,
    )} — Qty ${formatNumber(req.quantity_needed)}`;

    if (y > pageHeight - 80) {
      doc.addPage();
      y = 40;
    }
    doc.setFont(undefined, 'bold');
    doc.text(`Requirement ${idx + 1}: ${reqLabel}`, 40, y);
    y += 12;
    doc.setFont(undefined, 'normal');

    (block.results || []).forEach((r, j) => {
      if (!r) return;
      if (r.unfulfilled != null) {
        const line = `Unfulfilled: ${r.unfulfilled} pcs (insufficient stock)`;
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 40;
        }
        doc.text(line, 54, y);
        y += 12;
        return;
      }

      if (r.cut_type === 'weld') {
        const weldLabel = `Weld assembly ${j + 1} (target ${r.required_length ?? req.length}mm, welds ${
          r.welds_needed ?? Math.max(0, (r.segments || []).length - 1)
        })`;
        if (y > pageHeight - 60) {
          doc.addPage();
          y = 40;
        }
        doc.text(weldLabel, 54, y);
        y += 6;

        (r.segments || []).forEach((s) => {
          if (y > pageHeight - 40) {
            doc.addPage();
            y = 40;
          }
          const total = (s.source_length || 0) || 1;
          const used = s.segment_length || 0;
          const remLen = s.remainder || 0;
          const scale = maxBarWidth / total;
          const barX = 54;

          // Outline
          doc.setDrawColor(150);
          doc.setFillColor(230);
          doc.rect(barX, y, maxBarWidth, barHeight, 'S');

          // Used (green)
          doc.setFillColor(46, 204, 113);
          doc.rect(barX, y, used * scale, barHeight, 'F');

          // Remainder (red)
          if (remLen > 0) {
            doc.setFillColor(231, 76, 60);
            doc.rect(barX + used * scale, y, remLen * scale, barHeight, 'F');
          }

          // Legend text
          doc.setTextColor(80);
          doc.text(
            `${used}mm used from ${total}mm${remLen > 0 ? ` · rem ${remLen}mm` : ''}`,
            barX + maxBarWidth + 8,
            y + barHeight - 1,
          );
          doc.setTextColor(0);

          y += barHeight + 6;
        });
        return;
      }

      if (r.part_of_weld || !r.pipe_id) return;

      if (r.cut_type === 'exact') {
        const line = `Exact: ${req.length}mm from ${r.source_length}mm (qty ${r.quantity_used ?? 1})`;
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 40;
        }
        doc.text(line, 54, y);
        y += 4;

        const total = (r.source_length || 0) || 1;
        const used = req.length || 0;
        const remLen = total - used;
        const scale = maxBarWidth / total;
        const barX = 54;

        doc.setDrawColor(150);
        doc.rect(barX, y, maxBarWidth, barHeight, 'S');
        doc.setFillColor(46, 204, 113);
        doc.rect(barX, y, used * scale, barHeight, 'F');
        if (remLen > 0) {
          doc.setFillColor(231, 76, 60);
          doc.rect(barX + used * scale, y, remLen * scale, barHeight, 'F');
        }
        y += barHeight + 8;
        return;
      }

      if (r.cut_type === 'cut') {
        const remLen = r.remainder || 0;
        const line = `Cut: ${r.cuts_from_this_pipe ?? 1} × ${r.cut_length ?? req.length}mm from ${
          r.source_length
        }mm${remLen > 0 ? `, rem ${remLen}mm` : ''}`;
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 40;
        }
        doc.text(line, 54, y);
        y += 4;

        const total = (r.source_length || 0) || 1;
        const used = r.used_length || 0;
        const scale = maxBarWidth / total;
        const barX = 54;

        doc.setDrawColor(150);
        doc.rect(barX, y, maxBarWidth, barHeight, 'S');
        doc.setFillColor(46, 204, 113);
        doc.rect(barX, y, used * scale, barHeight, 'F');
        if (remLen > 0) {
          doc.setFillColor(231, 76, 60);
          doc.rect(barX + used * scale, y, remLen * scale, barHeight, 'F');
        }
        y += barHeight + 8;
      }
    });

    y += 6;
  });

  doc.save(`${safePrefix}-cut-weld-plan.pdf`);
}

