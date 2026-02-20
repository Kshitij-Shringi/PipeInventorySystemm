from pydantic import BaseModel, Field


class PipeEntry(BaseModel):
    from_supplier: str = Field(..., description='Supplier name; stored as "from" in MongoDB')
    length: float
    width: float
    height: float
    quantity: int


class PipeEntryInDB(PipeEntry):
    id: str


class OrderRequirement(BaseModel):
    length: float
    width: float
    height: float
    quantity_needed: int


class OrderRequest(BaseModel):
    recipient: str
    requirements: list[OrderRequirement]


class RemainderDecision(BaseModel):
    pipe_id: str
    remainder_length: float
    width: float
    height: float
    from_supplier: str
    keep: bool


class ExecuteOrderRequest(BaseModel):
    recipient: str
    fulfillments: list[dict]
    remainder_decisions: list[RemainderDecision]
    analysis: list[dict] = Field(default=[], description="Analysis results for visualization")
