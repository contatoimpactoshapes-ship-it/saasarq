"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { WorkflowEditor } from "@/components/workflow/WorkflowEditor";

type Names = { spaceName: string; wfName: string };

export default function WorkflowCanvasPage() {
  const params     = useParams();
  const spaceId    = params.id    as string;
  const workflowId = params.wfId  as string;

  const [names, setNames] = useState<Names | null>(null);

  useEffect(() => {
    async function loadNames() {
      try {
        const res = await fetch(`/api/spaces/${spaceId}`);
        if (!res.ok) return;
        const data = await res.json();
        const wfMap = (data.canvasData?.workflows ?? {}) as Record<string, { name?: string }>;
        setNames({
          spaceName: data.name ?? "Space",
          wfName:    wfMap[workflowId]?.name ?? "Canvas",
        });
      } catch { /* breadcrumb falls back to "..." */ }
    }
    loadNames();
  }, [spaceId, workflowId]);

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        breadcrumb={[
          { label: "Spaces",                   href: "/app/spaces" },
          { label: names?.spaceName ?? "...",  href: `/app/spaces/${spaceId}` },
          { label: names?.wfName    ?? "Canvas" },
        ]}
      />
      <WorkflowEditor spaceId={spaceId} workflowId={workflowId} />
    </div>
  );
}
