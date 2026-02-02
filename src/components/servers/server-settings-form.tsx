"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, Trash2, AlertTriangle } from "lucide-react";
import { updateServer, deleteServer } from "@/lib/actions/servers";
import type { Server } from "@/lib/types/database";

interface ServerSettingsFormProps {
    server: Server;
}

export function ServerSettingsForm({ server }: ServerSettingsFormProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState(server.name);
    const [ip, setIp] = useState(server.ip);

    const hasChanges = name !== server.name || ip !== server.ip;

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!hasChanges) return;

        setIsSaving(true);
        setError(null);
        setSuccess(null);

        const result = await updateServer(server.id, { name, ip });

        if (result.error) {
            setError(result.error);
            setIsSaving(false);
            return;
        }

        setSuccess("Server updated successfully!");
        setIsSaving(false);
        router.refresh();
    }

    async function handleDelete() {
        setIsDeleting(true);
        setError(null);

        const result = await deleteServer(server.id);

        if (result.error) {
            setError(result.error);
            setIsDeleting(false);
            setDeleteDialogOpen(false);
            return;
        }

        router.push("/dashboard");
    }

    return (
        <div className="space-y-6">
            {/* Edit Server Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Server Details</CardTitle>
                    <CardDescription>
                        Update your server's display name and connection information.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Server Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="My VPS"
                                    required
                                    disabled={isSaving}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ip">IP Address / Hostname</Label>
                                <Input
                                    id="ip"
                                    value={ip}
                                    onChange={(e) => setIp(e.target.value)}
                                    placeholder="203.0.113.10"
                                    required
                                    disabled={isSaving}
                                />
                            </div>
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {success && (
                            <Alert className="border-green-500 bg-green-500/10">
                                <AlertDescription className="text-green-700 dark:text-green-400">
                                    {success}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="flex gap-2">
                            <Button type="submit" disabled={isSaving || !hasChanges}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </Button>
                            {hasChanges && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setName(server.name);
                                        setIp(server.ip);
                                        setError(null);
                                        setSuccess(null);
                                    }}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>
                        Irreversible actions that affect this server.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                        <div>
                            <p className="font-medium">Delete Server</p>
                            <p className="text-sm text-muted-foreground">
                                Permanently remove this server and all associated data.
                            </p>
                        </div>
                        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-destructive" />
                                        Delete Server
                                    </DialogTitle>
                                    <DialogDescription>
                                        Are you sure you want to delete <strong>{server.name}</strong>?
                                        This action cannot be undone and will remove:
                                    </DialogDescription>
                                </DialogHeader>
                                <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                                    <li>All VPN users associated with this server</li>
                                    <li>All logs and command history</li>
                                    <li>Server configuration and settings</li>
                                </ul>
                                <p className="text-sm text-muted-foreground">
                                    The agent on the server will no longer be able to connect.
                                </p>
                                <DialogFooter className="gap-2 sm:gap-0">
                                    <Button
                                        variant="outline"
                                        onClick={() => setDeleteDialogOpen(false)}
                                        disabled={isDeleting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        Yes, Delete Server
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
