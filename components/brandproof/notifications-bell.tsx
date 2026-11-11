"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, CheckCircle2, AlertTriangle, MessageSquare, Send, X, ExternalLink } from "lucide-react";
import { NotificationItem, getNotificationsAction } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [hasUnread, setHasUnread] = React.useState(false);
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    let mounted = true;
    getNotificationsAction().then((res) => {
      if (mounted && res.success) {
        setNotifications(res.notifications);
        if (res.notifications.length > 0) {
          setHasUnread(true);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllAsRead = () => {
    const all = new Set(notifications.map((n) => n.id));
    setReadIds(all);
    setHasUnread(false);
  };

  const getNotificationIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "decision":
        return <CheckCircle2 className="w-4 h-4 text-moss shrink-0" />;
      case "submission":
        return <Send className="w-4 h-4 text-accent shrink-0" />;
      case "comment":
        return <MessageSquare className="w-4 h-4 text-slate shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-ink-soft shrink-0" />;
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-sm text-ink-soft hover:text-ink hover:bg-paper-sunken transition-colors cursor-pointer"
        title="View Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 stroke-[1.75]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-oxblood ring-2 ring-paper" />
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute right-4 sm:right-0 top-14 sm:top-full mt-1 w-80 max-w-[90vw] bg-paper-raised border border-rule shadow-xl rounded-sm z-50 font-sans text-xs flex flex-col max-h-[420px]">
          {/* Header */}
          <div className="p-3 bg-paper border-b border-rule flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-ink uppercase tracking-wider">
              <Bell className="w-3.5 h-3.5 text-accent" />
              <span>In-App Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-oxblood/10 text-oxblood px-1.5 py-0.2 rounded-sm text-[10px] border border-oxblood/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="font-mono text-[10px] text-accent hover:underline cursor-pointer"
                >
                  Mark read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-ink-soft hover:text-ink cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-rule">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-ink-soft">
                <Bell className="w-6 h-6 stroke-[1.2] text-ink-soft/40 mx-auto mb-2" />
                <p>No notifications yet.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isRead = readIds.has(n.id);

                return (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => {
                      setReadIds((prev) => new Set([...prev, n.id]));
                      setIsOpen(false);
                    }}
                    className={cn(
                      "p-3 flex items-start gap-2.5 hover:bg-paper transition-colors block text-ink",
                      !isRead && "bg-accent/5 font-medium"
                    )}
                  >
                    {getNotificationIcon(n.type)}
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="text-xs font-semibold text-ink leading-snug truncate">
                        {n.title}
                      </div>
                      <p className="text-[11px] text-ink-soft leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      <div className="font-mono text-[10px] text-ink-soft/80 pt-0.5">
                        {new Date(n.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

