"use client";

import { useState, useId } from "react";
import { addVpnUser } from "@/lib/actions/vpn-users";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface AddUserDialogProps {
  serverId: string;
}

export function AddUserDialog({ serverId }: AddUserDialogProps) {
  const dialogId = useId();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const note = formData.get("note") as string;
    const dataLimitStr = formData.get("dataLimit") as string;
    const expiryStr = formData.get("expiry") as string;

    const dataLimit = dataLimitStr ? parseInt(dataLimitStr) : undefined;
    const expiry = expiryStr ? new Date(expiryStr).toISOString() : undefined;

    const result = await addVpnUser(serverId, username, note, dataLimit, expiry);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`User "${username}" creation queued`);
      setOpen(false);
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button suppressHydrationWarning>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add VPN User</DialogTitle>
          <DialogDescription>
            Create a new user with access to all services. You can restrict
            services later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              placeholder="alice"
              required
              pattern="[a-zA-Z0-9_\-]+"
              title="Letters, numbers, hyphens, and underscores only"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Input
              id="note"
              name="note"
              placeholder="e.g. Family member"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataLimit">Data Limit (GB)</Label>
              <Input
                id="dataLimit"
                name="dataLimit"
                type="number"
                min="1"
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input
                id="expiry"
                name="expiry"
                type="date"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Add User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
