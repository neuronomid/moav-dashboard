"use client";

import { useState, useId } from "react";
import { updateVpnUser } from "@/lib/actions/vpn-users";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { VpnUser } from "@/lib/types/database";

interface EditUserDialogProps {
    user: VpnUser;
    serverId: string;
}

const SUPPORTED_PROTOCOLS = [
    "wireguard",
    "hysteria2",
    "trojan",
    "vless_reality",
    "dnstt",
    "conduit",
];

export function EditUserDialog({ user, serverId }: EditUserDialogProps) {
    const dialogId = useId();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Initialize state with user values
    const [policy, setPolicy] = useState<Record<string, boolean>>(
        user.access_policy ||
        // If null, assume all true for now
        SUPPORTED_PROTOCOLS.reduce((acc, p) => ({ ...acc, [p]: true }), {})
    );

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const username = formData.get("username") as string;
        const note = formData.get("note") as string;
        const dataLimitStr = formData.get("dataLimit") as string;
        const expiryStr = formData.get("expiry") as string;

        const dataLimit = dataLimitStr ? parseInt(dataLimitStr) : null;
        const expiry = expiryStr ? new Date(expiryStr).toISOString() : null;

        const updates = {
            username,
            note,
            data_limit_gb: dataLimit,
            expires_at: expiry,
            access_policy: policy,
        };

        const result = await updateVpnUser(serverId, user.id, updates);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(`Update queued for "${username}"`);
            setOpen(false);
            router.refresh();
        }
        setLoading(false);
    }

    // Helper to safely format date for input value (YYYY-MM-DD)
    const formatDateForInput = (isoString: string | null) => {
        if (!isoString) return "";
        return new Date(isoString).toISOString().split("T")[0];
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" title="Edit User" suppressHydrationWarning>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit User</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Edit User: {user.username}</DialogTitle>
                    <DialogDescription>
                        Update settings and access controls.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Identity & Limits Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="username" className="text-xs">Username</Label>
                            <Input
                                id="username"
                                name="username"
                                defaultValue={user.username}
                                placeholder="alice"
                                className="h-8"
                                pattern="[a-zA-Z0-9_\-]+"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="dataLimit" className="text-xs">Data Limit (GB)</Label>
                            <Input
                                id="dataLimit"
                                name="dataLimit"
                                type="number"
                                min="1"
                                defaultValue={user.data_limit_gb?.toString() || ""}
                                placeholder="Unlimited"
                                className="h-8"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="expiry" className="text-xs">Expiry Date</Label>
                            <Input
                                id="expiry"
                                name="expiry"
                                type="date"
                                className="h-8 block w-full"
                                min={new Date().toISOString().split("T")[0]}
                                defaultValue={formatDateForInput(user.expires_at)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="note" className="text-xs">Note</Label>
                            <Input
                                id="note"
                                name="note"
                                defaultValue={user.note || ""}
                                placeholder="Optional"
                                className="h-8"
                            />
                        </div>
                    </div>

                    {/* Access Policy Section */}
                    <div className="space-y-2 rounded-md border p-3 bg-muted/40">
                        <h3 className="text-xs font-semibold mb-2">Allowed Services</h3>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                            {SUPPORTED_PROTOCOLS.map((proto) => (
                                <div key={proto} className="flex items-center justify-between">
                                    <Label htmlFor={`proto-${proto}`} className="text-sm capitalize font-normal cursor-pointer select-none">
                                        {proto.replace("_", " ").replace("-", " ")}
                                    </Label>
                                    <Switch
                                        id={`proto-${proto}`}
                                        checked={policy[proto] ?? true}
                                        onCheckedChange={(checked: boolean) =>
                                            setPolicy((prev) => ({ ...prev, [proto]: checked }))
                                        }
                                        className="data-[state=checked]:bg-green-600"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={loading}>
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
