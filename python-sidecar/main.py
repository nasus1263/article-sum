import trafilatura
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class CrawlRequest(BaseModel):
    url: str


class CrawlResponse(BaseModel):
    success: bool
    text: str | None = None


@app.post("/crawl", response_model=CrawlResponse)
def crawl(req: CrawlRequest) -> CrawlResponse:
    downloaded = trafilatura.fetch_url(req.url)
    if not downloaded:
        return CrawlResponse(success=False)
    text = trafilatura.extract(downloaded)
    if not text:
        return CrawlResponse(success=False)
    return CrawlResponse(success=True, text=text)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
