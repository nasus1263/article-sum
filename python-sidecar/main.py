import json

import trafilatura
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class CrawlRequest(BaseModel):
    url: str


class CrawlResponse(BaseModel):
    success: bool
    text: str | None = None
    image: str | None = None
    title: str | None = None


@app.post("/crawl", response_model=CrawlResponse)
def crawl(req: CrawlRequest) -> CrawlResponse:
    downloaded = trafilatura.fetch_url(req.url)
    if not downloaded:
        return CrawlResponse(success=False)
    extracted = trafilatura.extract(downloaded, url=req.url, output_format="json", with_metadata=True)
    if not extracted:
        return CrawlResponse(success=False)
    result = json.loads(extracted)
    text = result.get("text")
    if not text:
        return CrawlResponse(success=False)
    return CrawlResponse(success=True, text=text, image=result.get("image"), title=result.get("title"))


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
