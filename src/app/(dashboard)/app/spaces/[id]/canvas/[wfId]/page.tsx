"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { WorkflowEditor } from "@/components/workflow/WorkflowEditor";
import { EnvironmentSidebar } from "@/components/workflow/EnvironmentSidebar";

type Names = { spaceName: string; wfName: string };

export default function WorkflowCanvasPage() {
  const params     = useParams();
  const router     = useRouter();
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

  function handleSwitch(newWfId: string) {
    if (newWfId === workflowId) return;
    router.push(`/app/spaces/${spaceId}/canvas/${newWfId}`);
  }

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        breadcrumb={[
          { label: "Spaces",                   href: "/app/spaces" },
          { label: names?.spaceName ?? "...",  href: `/app/spaces/${spaceId}` },
          { label: names?.wfName    ?? "Canvas" },
        ]}
      />
      <div className="flex flex-1 min-h-0">
        <EnvironmentSidebar
          spaceId={spaceId}
          activeId={workflowId}
          spaceName={names?.spaceName ?? ""}
          onSwitch={handleSwitch}
        />
        <WorkflowEditor key={workflowId} spaceId={spaceId} workflowId={workflowId} />
      </div>
    </div>
  );
}
