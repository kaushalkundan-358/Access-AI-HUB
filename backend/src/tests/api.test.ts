import request from "supertest";
import jwt from "jsonwebtoken";
import { existsSync } from "node:fs";

jest.mock("../config/database", () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue(1)
  }
}));
jest.mock("../services/aiService", () => ({
  aiService: {
    simplify: jest.fn().mockResolvedValue({
      task: "simplify",
      text: "A simpler sentence.",
      model: "test-model"
    }),
    summarize: jest.fn().mockResolvedValue({ task: "summarize", text: "Summary.", model: "test-model" }),
    explain: jest.fn().mockResolvedValue({ task: "explain", text: "Explanation.", model: "test-model" }),
    translate: jest.fn().mockResolvedValue({ task: "translate", text: "अनुवाद।", model: "test-model" })
  }
}));
jest.mock("../services/documentService", () => ({
  documentService: {
    upload: jest.fn().mockResolvedValue({
      id: "clh1234567890123456789012",
      originalName: "example.pdf",
      pageCount: 1,
      extractionMethod: "text",
      characterCount: 25
    }),
    getText: jest.fn().mockResolvedValue({
      id: "clh1234567890123456789012",
      originalName: "example.pdf",
      extractedText: "Example extracted text",
      createdAt: new Date("2026-01-01T00:00:00.000Z")
    })
  }
}));
jest.mock("../services/profileService", () => ({
  profileService: {
    list: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({
      id: "clh1234567890123456789012",
      name: "Default",
      fontSize: "medium",
      contrastMode: "normal",
      preferredLanguage: "en",
      readingPreferences: {}
    }),
    update: jest.fn().mockResolvedValue({
      id: "clh1234567890123456789012",
      fontSize: "large"
    }),
    remove: jest.fn().mockResolvedValue(undefined)
  }
}));
jest.mock("../services/userService", () => ({
  userService: {
    register: jest.fn().mockResolvedValue({
      user: { id: "clh1234567890123456789012", email: "reader@example.com" },
      accessToken: "test-token"
    }),
    login: jest.fn().mockResolvedValue({
      user: { id: "clh1234567890123456789012", email: "reader@example.com" },
      accessToken: "test-token"
    }),
    getById: jest.fn()
  }
}));

import { app } from "../app";
import { documentService } from "../services/documentService";

const accessToken = jwt.sign(
  { email: "reader@example.com" },
  process.env.JWT_SECRET!,
  { subject: "clh1234567890123456789012", expiresIn: 3600 }
);

describe("AccessHub AI API", () => {
  it("reports API and database health", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "ok", database: "connected" }
    });
  });

  it("rejects malformed registration input", async () => {
    const response = await request(app)
      .post("/api/users/register")
      .send({ email: "not-an-email", password: "short" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication for accessibility profiles", async () => {
    const response = await request(app).get("/api/profiles");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("requires authentication for AI operations", async () => {
    const response = await request(app)
      .post("/api/ai/simplify")
      .send({ text: "A short example." });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("registers an account and returns a token", async () => {
    const response = await request(app)
      .post("/api/users/register")
      .send({ email: "reader@example.com", password: "A-long-password-123" });

    expect(response.status).toBe(201);
    expect(response.body.data.accessToken).toBe("test-token");
  });

  it("signs in an account and returns a token", async () => {
    const response = await request(app)
      .post("/api/users/login")
      .send({ email: "reader@example.com", password: "A-long-password-123" });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBe("test-token");
  });

  it("serves the OpenAPI documentation", async () => {
    const response = await request(app).get("/api/docs");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/openapi.yaml");
  });

  it("runs AI operations for an authenticated account", async () => {
    const response = await request(app)
      .post("/api/ai/simplify")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ text: "A sentence that needs simplification." });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      task: "simplify",
      text: "A simpler sentence.",
      model: "test-model"
    });
  });

  it.each([
    ["/api/ai/summarize", { text: "A source text." }, "Summary."],
    ["/api/ai/explain", { text: "A source text.", topic: "Topic" }, "Explanation."],
    ["/api/ai/translate", { text: "Hello", targetLanguage: "hi" }, "अनुवाद।"]
  ])("runs the AI route %s", async (url, payload, expectedText) => {
    const response = await request(app)
      .post(url)
      .set("Authorization", `Bearer ${accessToken}`)
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.data.text).toBe(expectedText);
  });

  it("accepts PDF upload and removes its temporary file", async () => {
    const response = await request(app)
      .post("/api/documents/upload")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("file", Buffer.from("%PDF-1.4\nplaceholder"), {
        filename: "example.pdf",
        contentType: "application/pdf"
      });

    expect(response.status).toBe(201);
    expect(response.body.data.extractionMethod).toBe("text");

    const uploadedPath = jest.mocked(documentService.upload).mock.calls[0]?.[1]?.path;
    expect(uploadedPath).toBeDefined();
    expect(existsSync(uploadedPath!)).toBe(false);
  });

  it("lists the authenticated user's profiles", async () => {
    const response = await request(app)
      .get("/api/profiles")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it("creates, updates, and deletes an accessibility profile", async () => {
    const created = await request(app)
      .post("/api/profiles")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Large text", fontSize: "large" });
    const id = "clh1234567890123456789012";
    const updated = await request(app)
      .put(`/api/profiles/${id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ fontSize: "large" });
    const deleted = await request(app)
      .delete(`/api/profiles/${id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(created.status).toBe(201);
    expect(updated.status).toBe(200);
    expect(deleted.status).toBe(200);
  });

  it("retrieves extracted text for an owned document", async () => {
    const response = await request(app)
      .get("/api/documents/clh1234567890123456789012/text")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.extractedText).toBe("Example extracted text");
  });

  it("returns a configuration error instead of fake AI output when credentials are missing", async () => {
    const { completeTextTask } = await import("../services/aiProvider");
    await expect(completeTextTask("simplify", "instruction", "text")).rejects.toMatchObject({
      statusCode: 503,
      code: "AI_NOT_CONFIGURED"
    });
  });

  it("returns a JSON not-found response for unknown endpoints", async () => {
    const response = await request(app).get("/api/not-a-route");

    expect(response.status).toBe(404);
  });
});
