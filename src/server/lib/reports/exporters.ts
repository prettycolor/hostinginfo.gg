/**
 * Report Export Utilities
 *
 * Export report data to CSV and JSON formats.
 */

import { stringify } from "csv-stringify/sync";
import fs from "fs/promises";
import path from "path";
import type { ReportData } from "./pdf-generator.js";

type ExportResult = {
  success: boolean;
  filePath?: string;
  error?: string;
  fileSize?: number;
};
type CSVCell = string | number | boolean | null | undefined;
type CSVRow = Record<string, CSVCell>;

interface TableSectionContent {
  columns?: string[];
  rows?: Array<Record<string, unknown>>;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTableSectionContent(value: unknown): value is TableSectionContent {
  if (!isObjectRecord(value)) {
    return false;
  }

  if (
    "columns" in value &&
    value.columns !== undefined &&
    !Array.isArray(value.columns)
  ) {
    return false;
  }

  if (
    "rows" in value &&
    value.rows !== undefined &&
    !Array.isArray(value.rows)
  ) {
    return false;
  }

  return true;
}

function toCsvCell(value: unknown): CSVCell {
  if (value == null) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return JSON.stringify(value);
}

/**
 * Export report data to CSV format
 */
export async function exportToCSV(
  data: ReportData,
  outputPath: string,
): Promise<ExportResult> {
  try {
    // Flatten report data for CSV
    const rows: CSVRow[] = [];

    // Add header row
    rows.push({
      "Report Title": data.title,
      Domain: data.domain,
      "Generated At": new Date(data.generatedAt).toISOString(),
      Type: data.type,
    });

    // Add empty row
    rows.push({});

    // Add sections
    for (const section of data.sections) {
      rows.push({
        Section: section.title,
        Type: section.type,
      });

      // Handle different section types
      if (section.type === "metrics" && typeof section.content === "object") {
        const metrics = section.content as Record<string, unknown>;
        for (const [key, value] of Object.entries(metrics)) {
          rows.push({
            Metric: key,
            Value: toCsvCell(value),
          });
        }
      } else if (
        section.type === "table" &&
        isTableSectionContent(section.content)
      ) {
        const tableData = section.content;
        const columns = tableData.columns || [];
        const tableRows = tableData.rows || [];

        // Add table header
        const headerRow: CSVRow = {};
        columns.forEach((col: string, idx: number) => {
          headerRow[`Column ${idx + 1}`] = col;
        });
        rows.push(headerRow);

        // Add table rows
        tableRows.forEach((rowData: Record<string, unknown>) => {
          const dataRow: CSVRow = {};
          columns.forEach((col: string, idx: number) => {
            dataRow[`Column ${idx + 1}`] = toCsvCell(rowData[col]);
          });
          rows.push(dataRow);
        });
      } else if (section.type === "list" && Array.isArray(section.content)) {
        section.content.forEach((item: unknown, idx: number) => {
          rows.push({
            Item: idx + 1,
            Content: toCsvCell(item),
          });
        });
      } else {
        // Text content
        rows.push({
          Content:
            typeof section.content === "string"
              ? section.content.replace(/<[^>]*>/g, "") // Strip HTML tags
              : JSON.stringify(section.content),
        });
      }

      // Add empty row between sections
      rows.push({});
    }

    // Convert to CSV
    const csv = stringify(rows, {
      header: true,
      quoted: true,
    });

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Write CSV file
    await fs.writeFile(outputPath, csv, "utf-8");

    // Get file size
    const stats = await fs.stat(outputPath);

    return {
      success: true,
      filePath: outputPath,
      fileSize: stats.size,
    };
  } catch {
    return {
      success: false,
      error: "An internal error occurred",
    };
  }
}

/**
 * Export report data to JSON format
 */
export async function exportToJSON(
  data: ReportData,
  outputPath: string,
  pretty: boolean = true,
): Promise<ExportResult> {
  try {
    // Convert to JSON
    const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Write JSON file
    await fs.writeFile(outputPath, json, "utf-8");

    // Get file size
    const stats = await fs.stat(outputPath);

    return {
      success: true,
      filePath: outputPath,
      fileSize: stats.size,
    };
  } catch {
    return {
      success: false,
      error: "An internal error occurred",
    };
  }
}

/**
 * Export report in multiple formats
 */
export async function exportMultiFormat(
  data: ReportData,
  baseOutputPath: string,
  formats: ("pdf" | "html" | "csv" | "json")[],
): Promise<{
  success: boolean;
  results: Record<string, ExportResult>;
}> {
  const results: Record<string, ExportResult> = {};

  for (const format of formats) {
    const outputPath = baseOutputPath.replace(/\.[^.]+$/, `.${format}`);

    try {
      switch (format) {
        case "csv":
          results[format] = await exportToCSV(data, outputPath);
          break;
        case "json":
          results[format] = await exportToJSON(data, outputPath);
          break;
        default:
          results[format] = {
            success: false,
            error: `Format ${format} not supported in multi-format export`,
          };
      }
    } catch {
      results[format] = {
        success: false,
        error: "An internal error occurred",
      };
    }
  }

  const allSuccess = Object.values(results).every((result) => result.success);

  return {
    success: allSuccess,
    results,
  };
}

// Re-export formatFileSize from shared utilities
export { formatFileSize } from "../../../lib/format-utils.js";
