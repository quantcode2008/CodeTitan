"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import { WorkspaceRole } from "@/lib/auth/types";
import {
  uploadBrandAssetAction,
  deleteBrandAssetAction,
} from "@/lib/actions/brand";
import {
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  FileCheck,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";

export interface BrandAssetRecord {
  id: string;
  workspace_id: string;
  name: string;
  storage_path: string;
  alt_text_required: boolean;
  usage_rule: string;
  source_id: string | null;
  source_key?: string | null;
  created_at: string;
  signedUrl: string | null;
}

export interface AssetsManagerProps {
  workspaceId: string;
  initialAssets: BrandAssetRecord[];
  sourcesList: Array<{ id: string; source_key: string; title: string }>;
  currentRole: WorkspaceRole;
}

export function AssetsManager({
  workspaceId,
  initialAssets,
  sourcesList,
  currentRole,
}: AssetsManagerProps) {
  const isAdmin = currentRole === "admin";

  const [assets, setAssets] = React.useState<BrandAssetRecord[]>(initialAssets);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  // Form State
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [assetName, setAssetName] = React.useState("");
  const [altTextRequired, setAltTextRequired] = React.useState(true);
  const [usageRule, setUsageRule] = React.useState("");
  const [sourceId, setSourceId] = React.useState("");

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;

    if (!selectedFile) {
      setErrorMsg("Please select an image file to upload.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("name", assetName);
    formData.append("altTextRequired", altTextRequired ? "true" : "false");
    formData.append("usageRule", usageRule);
    if (sourceId) {
      formData.append("sourceId", sourceId);
    }

    startTransition(async () => {
      const res = await uploadBrandAssetAction(workspaceId, formData);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to upload asset.");
      } else {
        setSuccessMsg(`Uploaded brand asset "${assetName}" successfully.`);
        if (res.data) {
          setAssets((prev) => [
            {
              ...res.data,
              signedUrl: URL.createObjectURL(selectedFile),
            },
            ...prev,
          ]);
        }
        setIsDrawerOpen(false);
        setSelectedFile(null);
        setAssetName("");
        setUsageRule("");
      }
    });
  }

  async function handleDelete(asset: BrandAssetRecord) {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to delete asset "${asset.name}"?`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteBrandAssetAction(workspaceId, asset.id);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to delete asset.");
      } else {
        setSuccessMsg(`Deleted asset "${asset.name}".`);
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      }
    });
  }

  function handleCopyPath(path: string, id: string) {
    navigator.clipboard.writeText(path);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {errorMsg && (
        <div
          role="alert"
          className="p-3 rounded-sm bg-oxblood-tint/60 border border-oxblood/30 text-oxblood text-xs font-sans flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 stroke-[1.5]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="p-3 rounded-sm bg-moss-tint/60 border border-moss/30 text-moss text-xs font-sans flex items-start gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 stroke-[1.5]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Control Bar */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono text-ink-soft">
          <span>{assets.length} {assets.length === 1 ? "asset" : "assets"} registered in private bucket</span>
        </div>

        {isAdmin ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setErrorMsg(null);
              setIsDrawerOpen(true);
            }}
            className="text-xs font-mono tracking-wider uppercase h-9 px-3.5"
          >
            <UploadCloud className="w-3.5 h-3.5 mr-1 stroke-[1.5]" />
            Upload Brand Asset
          </Button>
        ) : (
          <div className="text-[11px] font-mono text-ink-soft flex items-center gap-1 px-2.5 py-1 bg-paper-sunken rounded-sm border border-rule">
            <Lock className="w-3 h-3 text-ink-soft" />
            <span>Read-Only</span>
          </div>
        )}
      </div>

      {/* Assets Grid */}
      {assets.length === 0 ? (
        <div className="p-12 text-center space-y-3 bg-paper-raised border border-rule rounded-sm">
          <ImageIcon className="w-8 h-8 text-ink-soft mx-auto stroke-[1.5]" />
          <h3 className="font-serif text-base font-medium text-ink">
            No brand assets uploaded yet
          </h3>
          <p className="font-sans text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
            No brand assets uploaded yet. Add official logos and photography rules
            to enforce alt-text and usage standards in creator drafts.
          </p>
          {isAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsDrawerOpen(true)}
              className="mt-2"
            >
              <UploadCloud className="w-3.5 h-3.5 mr-1" />
              Upload First Asset
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="p-4 rounded-sm bg-paper-raised border border-rule hover:border-ink-soft/40 transition-colors space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Image Preview Thumbnail */}
                <div className="h-40 w-full rounded-sm bg-paper-sunken border border-rule/70 flex items-center justify-center overflow-hidden relative group">
                  {asset.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.signedUrl}
                      alt={asset.name}
                      className="max-h-full max-w-full object-contain p-2"
                    />
                  ) : (
                    <div className="text-center p-3 font-mono text-[10px] text-ink-soft">
                      <Lock className="w-4 h-4 mx-auto mb-1 text-ink-faint" />
                      <span>Private Storage Asset</span>
                    </div>
                  )}

                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-sm bg-ink/80 text-paper font-mono text-[9px]">
                    Signed URL View
                  </span>
                </div>

                {/* Details */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-serif text-sm font-medium text-ink truncate">
                      {asset.name}
                    </h4>
                    {asset.alt_text_required ? (
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded-sm bg-ochre-tint text-ochre border border-ochre/30 font-semibold shrink-0">
                        Alt-Text Required
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded-sm bg-paper-sunken text-ink-soft border border-rule shrink-0">
                        Decorative
                      </span>
                    )}
                  </div>

                  <div className="mt-2 p-2 rounded-sm bg-paper text-ink-soft text-xs font-sans leading-relaxed border border-rule/70 line-clamp-3">
                    <strong className="text-ink font-mono text-[10px] block uppercase mb-0.5">
                      Usage Rule:
                    </strong>
                    {asset.usage_rule}
                  </div>
                </div>
              </div>

              {/* Footer Meta */}
              <div className="pt-2 border-t border-rule flex items-center justify-between font-mono text-[10px] text-ink-faint">
                <div className="flex items-center gap-1.5 truncate">
                  {asset.source_id && (
                    <Link
                      href={`/brand/sources/${asset.source_id}`}
                      className="text-accent hover:underline font-semibold"
                    >
                      [{asset.source_key || "Policy"}]
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCopyPath(asset.storage_path, asset.id)}
                    className="inline-flex items-center gap-1 hover:text-ink text-ink-soft cursor-pointer"
                    title="Copy private storage path"
                  >
                    {copiedId === asset.id ? (
                      <Check className="w-3 h-3 text-moss" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span className="truncate max-w-[120px]">
                      {asset.storage_path.split("/").pop()}
                    </span>
                  </button>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(asset)}
                    title="Delete asset"
                    className="p-1 rounded-sm text-ink-soft hover:text-oxblood hover:bg-oxblood-tint/50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Upload Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Upload Brand Asset"
        subtitle="Files are secured in private storage. Displays use time-limited signed URLs."
      >
        <form onSubmit={handleUpload} className="space-y-4 font-sans text-xs">
          <div>
            <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
              Asset Image File
            </label>
            <input
              type="file"
              required
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setSelectedFile(f);
                if (f && !assetName) {
                  setAssetName(f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
                }
              }}
              className="w-full text-xs font-mono text-ink file:mr-3 file:py-1.5 file:px-3 file:rounded-sm file:border file:border-rule file:text-xs file:font-mono file:bg-paper-raised file:cursor-pointer"
            />
            <p className="text-[10px] text-ink-faint mt-1">
              Supports PNG, JPEG, WebP, SVG up to 20MB. Stored in private bucket.
            </p>
          </div>

          <div>
            <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
              Asset Display Name
            </label>
            <Input
              type="text"
              required
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="e.g. Primary Fir & Mountain Crest"
              className="font-sans text-xs bg-paper"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={altTextRequired}
                onChange={(e) => setAltTextRequired(e.target.checked)}
                className="rounded-none border-rule text-accent focus:ring-accent"
              />
              <span className="font-mono text-xs text-ink font-medium">
                Mandatory Alternative Text (Accessibility Standard)
              </span>
            </label>
            <p className="text-[10px] text-ink-faint mt-0.5 pl-5">
              Drafts referencing this asset will be flagged if descriptive alt-text is missing.
            </p>
          </div>

          <div>
            <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
              Brand Usage Rule &amp; Clear-Space Guidelines
            </label>
            <textarea
              required
              rows={4}
              value={usageRule}
              onChange={(e) => setUsageRule(e.target.value)}
              placeholder="e.g. Maintain 50% clear space margin on all sides. Render only in forest ink (#16140F) or pure paper white..."
              className="w-full p-2.5 rounded-sm bg-paper border border-rule font-sans text-xs text-ink focus:border-accent focus-visible:outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
              Authoritative Linked Source
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full h-8 px-2.5 rounded-sm bg-paper border border-rule font-mono text-xs text-ink focus:border-accent"
            >
              <option value="">No linked source</option>
              {sourcesList.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.source_key}] {s.title}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-rule">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isPending}
            >
              {isPending ? "Uploading..." : "Upload Asset"}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

