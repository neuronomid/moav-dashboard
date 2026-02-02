"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Copy, Check } from "lucide-react";
import QRCode from "react-qr-code";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { VpnUser } from "@/lib/types/database";

interface UserConfigDialogProps {
    username: string;
    config: VpnUser["config_raw"];
}

export function UserConfigDialog({ username, config }: UserConfigDialogProps) {
    const [copied, setCopied] = useState(false);

    if (!config) {
        return null;
    }

    const protocols = Object.keys(config);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success("Config copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy config");
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" title="View Config">
                    <FileText className="h-4 w-4" />
                    <span className="sr-only">View Config</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>VPN Configuration for {username}</DialogTitle>
                    <DialogDescription>
                        Connection details for this user.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue={protocols[0]} className="w-full">
                    <TabsList className="w-full justify-start overflow-x-auto">
                        {protocols.map((proto) => (
                            <TabsTrigger key={proto} value={proto} className="capitalize">
                                {proto.replace("-", " ")}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {protocols.map((proto) => (
                        <TabsContent key={proto} value={proto} className="mt-4 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="flex items-center justify-center rounded-md border bg-white p-4">
                                    <QRCode
                                        value={config[proto]}
                                        size={150}
                                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                        viewBox={`0 0 256 256`}
                                    />
                                </div>
                                <div className="relative rounded-md border bg-muted p-4">
                                    <ScrollArea className="h-[150px] w-full rounded-md">
                                        <pre className="text-xs font-mono break-all whitespace-pre-wrap">
                                            {config[proto]}
                                        </pre>
                                    </ScrollArea>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="absolute right-2 top-2 h-8 w-8"
                                        onClick={() => copyToClipboard(config[proto])}
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Copy this configuration to your {proto} client.
                            </p>
                        </TabsContent>
                    ))}
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
