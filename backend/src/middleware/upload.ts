import fs from "node:fs";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { appConfig } from "../config/appConfig";
import { AppError } from "./errors";

fs.mkdirSync(appConfig.uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, appConfig.uploadDirectory),
  filename: (_request, _file, callback) => callback(null, `${crypto.randomUUID()}.pdf`)
});

export const pdfUpload = multer({
  storage,
  limits: {
    fileSize: appConfig.uploadMaxBytes,
    files: 1
  },
  fileFilter: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (file.mimetype !== "application/pdf" || extension !== ".pdf") {
      callback(new AppError(400, "Only PDF documents are accepted", "INVALID_FILE_TYPE"));
      return;
    }
    callback(null, true);
  }
}).single("file");
