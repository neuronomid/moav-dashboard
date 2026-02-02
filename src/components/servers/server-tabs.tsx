"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Tab {
    label: string;
    href: string;
}

interface ServerTabsProps {
    tabs: Tab[];
}

export function ServerTabs({ tabs }: ServerTabsProps) {
    const pathname = usePathname();

    return (
        <nav className="flex gap-1 border-b">
            {tabs.map((tab) => {
                // Exact match for overview (base), prefix match for others
                const isActive =
                    tab.href === pathname ||
                    (tab.href !== tabs[0].href && pathname.startsWith(tab.href));

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        prefetch={true}
                        className={cn(
                            "border-b-2 px-4 py-2 text-sm font-medium transition-all duration-200",
                            isActive
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                        )}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}
