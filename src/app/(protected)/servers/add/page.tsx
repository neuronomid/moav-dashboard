"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Server, Key, Globe, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProvisioningStep = "idle" | "connecting" | "checking" | "installing-moav" | "installing-agent" | "done" | "error";

interface ProvisioningStatus {
  step: ProvisioningStep;
  message: string;
  error?: string;
}

export default function AddServerPage() {
  const router = useRouter();
  const [installMode, setInstallMode] = useState<"existing" | "fresh">("existing");
  const [status, setStatus] = useState<ProvisioningStatus>({
    step: "idle",
    message: "",
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      ip: formData.get("ip") as string,
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      // MoaV installation options (only for fresh VPS)
      installMoav: installMode === "fresh",
      adminPassword: formData.get("adminPassword") as string,
    };

    // Start provisioning
    setStatus({ step: "connecting", message: "Connecting to server..." });

    try {
      const response = await fetch("/api/servers/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setStatus({
          step: "error",
          message: "Provisioning failed",
          error: result.error || "Unknown error",
        });
        return;
      }

      setStatus({
        step: "done",
        message: result.message || "Server added successfully!",
      });

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);

    } catch (error) {
      setStatus({
        step: "error",
        message: "Provisioning failed",
        error: error instanceof Error ? error.message : "Network error",
      });
    }
  }

  const isLoading = ["connecting", "checking", "installing-moav", "installing-agent"].includes(status.step);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Server"
        description="Connect a new VPS to the control panel"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Server Setup
            </CardTitle>
            <CardDescription>
              We&apos;ll connect via SSH to set up everything automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Server Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Server Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="My VPS"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ip" className="flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" />
                      IP Address
                    </Label>
                    <Input
                      id="ip"
                      name="ip"
                      placeholder="203.0.113.10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">SSH Username</Label>
                    <Input
                      id="username"
                      name="username"
                      placeholder="root"
                      defaultValue="root"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-1">
                    <Key className="h-3.5 w-3.5" />
                    SSH Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Installation Mode */}
              <Tabs value={installMode} onValueChange={(v) => setInstallMode(v as "existing" | "fresh")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing" disabled={isLoading}>
                    MoaV Installed
                  </TabsTrigger>
                  <TabsTrigger value="fresh" disabled={isLoading}>
                    Fresh VPS
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="existing" className="mt-4">
                  <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                    <p className="text-muted-foreground">
                      ✓ MoaV is already installed on this server. We&apos;ll just install the agent.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="fresh" className="mt-4 space-y-4">
                  <div className="rounded-lg border bg-blue-500/10 border-blue-500/30 p-3 text-sm">
                    <p className="text-blue-700 dark:text-blue-300">
                      We&apos;ll install MoaV (the VPN software) first, then the agent.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminPassword" className="flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5" />
                      MoaV Admin Password
                    </Label>
                    <Input
                      id="adminPassword"
                      name="adminPassword"
                      type="password"
                      placeholder="Choose a strong password"
                      required={installMode === "fresh"}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be the password for the MoaV admin panel on the server
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Status Messages */}
              {status.step === "error" && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{status.error}</AlertDescription>
                </Alert>
              )}

              {status.step === "done" && (
                <Alert className="border-green-500 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    {status.message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading || status.step === "done"}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading ? status.message : "Add Server"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">What happens next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Step
                number={1}
                title="Connect via SSH"
                description="We securely connect to your server."
                active={status.step === "connecting"}
                done={["checking", "installing-moav", "installing-agent", "done"].includes(status.step)}
              />
              {installMode === "fresh" && (
                <Step
                  number={2}
                  title="Install MoaV"
                  description="Install the VPN software (~5 min)."
                  active={status.step === "installing-moav"}
                  done={["installing-agent", "done"].includes(status.step)}
                />
              )}
              <Step
                number={installMode === "fresh" ? 3 : 2}
                title="Install Agent"
                description="Set up the agent as a system service."
                active={status.step === "installing-agent" || status.step === "checking"}
                done={status.step === "done"}
              />
              <Step
                number={installMode === "fresh" ? 4 : 3}
                title="Ready!"
                description="Your server appears in the dashboard."
                active={false}
                done={status.step === "done"}
              />
            </div>

            <div className="rounded-lg border bg-background p-3 text-sm">
              <p className="font-medium">🔒 Security Note</p>
              <p className="mt-1 text-muted-foreground">
                Your SSH password is used once for setup and is not stored.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  description,
  active,
  done
}: {
  number: number;
  title: string;
  description: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className={`flex gap-3 ${active ? "text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${done ? "bg-green-500 text-white" :
        active ? "bg-primary text-primary-foreground" :
          "bg-muted text-muted-foreground"
        }`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : number}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
