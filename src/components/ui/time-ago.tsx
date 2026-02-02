"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/utils";

interface TimeAgoProps {
    date: string | null;
    className?: string;
    /**
     * How often to re-render the component (in ms).
     * Defaults to 1000 (1 second).
     */
    refreshInterval?: number;
}

/**
 * A hydration-safe "time ago" component.
 * Renders a placeholder on the server, and only shows the actual
 * relative time after hydration on the client.
 */
export function TimeAgo({
    date,
    className,
    refreshInterval = 1000,
}: TimeAgoProps) {
    const [mounted, setMounted] = useState(false);
    const [text, setText] = useState<string>("");

    useEffect(() => {
        setMounted(true);
        setText(timeAgo(date));

        // Update the text periodically
        const interval = setInterval(() => {
            setText(timeAgo(date));
        }, refreshInterval);

        return () => clearInterval(interval);
    }, [date, refreshInterval]);

    // Render a non-breaking space on server to avoid layout shift
    // and prevent hydration mismatch
    if (!mounted) {
        return <span className={className}>&nbsp;</span>;
    }

    return <span className={className}>{text}</span>;
}
