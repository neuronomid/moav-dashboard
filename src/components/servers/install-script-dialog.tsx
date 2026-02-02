"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

interface InstallScriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverName: string;
  agentToken: string;
}

export function InstallScriptDialog({
  open,
  onOpenChange,
  serverName,
  agentToken,
}: InstallScriptDialogProps) {
  const [copied, setCopied] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "<SUPABASE_URL>";

  const installScript = `# Install MoaV Agent on "${serverName}"
# Run this on your VPS:

export SUPABASE_URL="${supabaseUrl}"
export AGENT_TOKEN="${agentToken}"

# Agent stub (for development — replace with real agent installer later)
# 1. Clone the moav-manager repo
# 2. cd agent && cp .env.example .env
# 3. Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AGENT_TOKEN
# 4. npm install && npm start`;

  async function copyToClipboard() {
    await navigator.clipboard.writeText(installScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Server Added: {serverName}</DialogTitle>
          <DialogDescription>
            Copy the agent token below and use it to configure the agent on
            your VPS. This token is shown only once.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
            {installScript}
          </pre>
          <Button
            size="sm"
            variant="secondary"
            className="absolute right-2 top-2"
            onClick={copyToClipboard}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
