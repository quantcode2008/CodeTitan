"use client";

import * as React from "react";
import { CommentItem, addCommentAction } from "@/lib/actions/comments";
import { createBrowserClient } from "@supabase/ssr";
import { MessageSquare, Send, Shield, User, Loader2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommentsPanelProps {
  reviewId: string;
  initialComments: CommentItem[];
  activeFindingId: string | null;
  currentUserId: string;
  currentUserRole: "admin" | "creator" | "reviewer";
  isDesignatedReviewer: boolean;
}

export function CommentsPanel({
  reviewId,
  initialComments,
  activeFindingId,
  currentUserId,
  currentUserRole,
  isDesignatedReviewer,
}: CommentsPanelProps) {
  const [comments, setComments] = React.useState<CommentItem[]>(initialComments);
  const [bodyText, setBodyText] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [filterMode, setFilterMode] = React.useState<"all" | "active_finding" | "review_level">("all");

  const commentsEndRef = React.useRef<HTMLDivElement>(null);

  // Filter comments according to filterMode
  const filteredComments = React.useMemo(() => {
    if (filterMode === "active_finding" && activeFindingId) {
      return comments.filter((c) => c.finding_id === activeFindingId);
    }
    if (filterMode === "review_level") {
      return comments.filter((c) => !c.finding_id);
    }
    return comments;
  }, [comments, filterMode, activeFindingId]);

  // Set up Supabase Realtime subscription for live comments
  React.useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return;

    try {
      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
      const channel = supabase
        .channel(`review-comments-${reviewId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "comments",
            filter: `review_id=eq.${reviewId}`,
          },
          (payload) => {
            const newComment = payload.new as any;
            setComments((prev) => {
              if (prev.some((c) => c.id === newComment.id)) return prev;
              return [
                ...prev,
                {
                  id: newComment.id,
                  review_id: newComment.review_id,
                  finding_id: newComment.finding_id,
                  author_id: newComment.author_id,
                  body: newComment.body,
                  created_at: newComment.created_at,
                  updated_at: newComment.updated_at,
                  author: {
                    id: newComment.author_id,
                    full_name: "Collaborator",
                    avatar_url: null,
                    role: "reviewer",
                    is_designated_reviewer: false,
                  },
                },
              ];
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      // Realtime subscription optional in sandbox / mocked environments
    }
  }, [reviewId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bodyText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const targetFindingId = filterMode === "active_finding" ? activeFindingId : null;

    const res = await addCommentAction({
      reviewId,
      findingId: targetFindingId,
      body: bodyText.trim(),
    });

    setIsSubmitting(false);

    if (res.success && res.comment) {
      setComments((prev) => [...prev, res.comment!]);
      setBodyText("");
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } else {
      setErrorMsg(res.error || "Failed to post comment.");
    }
  };

  return (
    <div className="bg-paper-raised border border-rule rounded-sm flex flex-col font-sans text-xs overflow-hidden h-[450px]">
      {/* Header */}
      <div className="p-3 bg-paper border-b border-rule flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-ink-soft stroke-[1.75]" />
          <span className="font-mono text-xs uppercase tracking-wider font-semibold text-ink">
            Editorial Discussion
          </span>
          <span className="font-mono text-[11px] text-ink-soft bg-paper-sunken px-1.5 py-0.2 rounded-sm border border-rule">
            {comments.length}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 font-mono text-[10px]">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={cn(
              "px-2 py-0.5 rounded-sm border cursor-pointer transition-colors",
              filterMode === "all"
                ? "bg-paper-sunken border-accent text-accent font-semibold"
                : "border-rule text-ink-soft hover:text-ink"
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("review_level")}
            className={cn(
              "px-2 py-0.5 rounded-sm border cursor-pointer transition-colors",
              filterMode === "review_level"
                ? "bg-paper-sunken border-accent text-accent font-semibold"
                : "border-rule text-ink-soft hover:text-ink"
            )}
          >
            Draft
          </button>
          {activeFindingId && (
            <button
              type="button"
              onClick={() => setFilterMode("active_finding")}
              className={cn(
                "px-2 py-0.5 rounded-sm border cursor-pointer transition-colors",
                filterMode === "active_finding"
                  ? "bg-paper-sunken border-accent text-accent font-semibold"
                  : "border-rule text-ink-soft hover:text-ink"
              )}
            >
              This Finding
            </button>
          )}
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-paper-raised">
        {filteredComments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-ink-soft">
            <MessageSquare className="w-6 h-6 stroke-[1.2] text-ink-soft/40 mb-2" />
            <p className="text-xs">No comments recorded yet.</p>
            <p className="text-[11px] font-serif italic text-ink-soft/80 mt-1">
              Start an editorial thread to discuss claims, tone adjustments, or rule interpretations.
            </p>
          </div>
        ) : (
          filteredComments.map((c) => {
            const author = c.author;
            const isMe = c.author_id === currentUserId;
            const isDesigRev = author?.is_designated_reviewer;

            return (
              <div
                key={c.id}
                className={cn(
                  "p-2.5 rounded-sm border space-y-1.5 transition-colors",
                  c.finding_id ? "bg-paper border-rule" : "bg-paper-raised border-rule shadow-hairline"
                )}
              >
                {/* Author row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-sm bg-accent/15 text-accent font-mono text-[10px] font-bold flex items-center justify-center">
                      {author?.full_name ? author.full_name.charAt(0) : "U"}
                    </div>
                    <span className="font-medium text-ink text-xs">{author?.full_name || "Unknown"}</span>
                    {author?.role && (
                      <span
                        className={cn(
                          "font-mono text-[9px] uppercase px-1 py-0.2 rounded-sm border",
                          author.role === "admin" && "bg-accent/10 border-accent/30 text-accent",
                          author.role === "reviewer" && isDesigRev && "bg-oxblood/10 border-oxblood/30 text-oxblood font-semibold",
                          author.role === "reviewer" && !isDesigRev && "bg-slate/10 border-slate/30 text-slate",
                          author.role === "creator" && "bg-paper-sunken border-rule text-ink-soft"
                        )}
                      >
                        {isDesigRev ? "Designated Reviewer" : author.role}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-ink-soft">
                    {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Finding tag if attached to a finding */}
                {c.finding_id && (
                  <div className="font-mono text-[10px] text-accent-soft text-ink-soft flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    Finding Note
                  </div>
                )}

                {/* Body */}
                <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap font-sans">
                  {c.body}
                </p>
              </div>
            );
          })
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSubmit} className="p-2.5 bg-paper border-t border-rule space-y-2">
        {filterMode === "active_finding" && activeFindingId && (
          <div className="text-[10px] font-mono text-accent flex items-center justify-between">
            <span>Commenting on currently selected finding</span>
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className="text-ink-soft hover:text-ink cursor-pointer underline"
            >
              Switch to Draft-level
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder={
              filterMode === "active_finding"
                ? "Add finding note or request clarification..."
                : "Post editorial comment to review thread..."
            }
            className="flex-1 text-xs px-2.5 py-1.5 rounded-sm bg-paper-raised border border-rule focus:outline-hidden focus:border-accent text-ink"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !bodyText.trim()}
            className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-paper rounded-sm font-medium flex items-center gap-1 transition-colors cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Post</span>
          </button>
        </div>
        {errorMsg && (
          <div className="text-[11px] text-oxblood">{errorMsg}</div>
        )}
      </form>
    </div>
  );
}

