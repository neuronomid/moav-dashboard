"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addServer } from "@/lib/actions/servers";
import { PageHeader } from "@/components/layout/page-header";
import { InstallScriptDialog } from "@/components/servers/install-script-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AddServerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newServer, setNewServer] = useState<{
    name: string;
    agent_token: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await addServer(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setNewServer({
      name: result.data!.name,
      agent_token: result.data!.agent_token,
    });
    setDialogOpen(true);
    setLoading(false);
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      router.push("/dashboard");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Server"
        description="Register a new VPS with MoaV installed"
      />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Server Details</CardTitle>
          <CardDescription>
            Enter the name and IP/domain of your VPS. After creation, you will
            receive an agent token to configure the agent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="My VPS"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="host">Host (IP or domain)</Label>
              <Input
                id="host"
                name="host"
                placeholder="203.0.113.10 or vpn.example.com"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Add Server"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {newServer && (
        <InstallScriptDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          serverName={newServer.name}
          agentToken={newServer.agent_token}
        />
      )}
    </div>
  );
}
