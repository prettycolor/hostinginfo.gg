"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
  data: unknown;
  filename: string;
  label?: string;
}

export function ExportButton({
  data,
  filename,
  label = "Export",
}: ExportButtonProps) {
  const handleExport = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
