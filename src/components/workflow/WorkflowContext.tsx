"use client";

import { createContext, useContext } from "react";

export interface WorkflowHandlers {
  onPreview:       (nodeId: string) => void;
  onEdit:          (nodeId: string) => void;
  onDownload:      (nodeId: string) => void;
  onRender:        (nodeId: string) => void;
  onDelete:        (nodeId: string) => void;
  onDuplicate:     (nodeId: string) => void;
  onReplace:       (nodeId: string) => void;
  onMoveToFolder:  (nodeId: string) => void;
  onFindSimilar:   (nodeId: string) => void;
  onHistory:       (nodeId: string) => void;
  onUpdatePrompt:  (nodeId: string, prompt: string) => void;
}

const noop  = (_: string) => {};
const noop2 = (_: string, __: string) => {};

const defaultHandlers: WorkflowHandlers = {
  onPreview:      noop,
  onEdit:         noop,
  onDownload:     noop,
  onRender:       noop,
  onDelete:       noop,
  onDuplicate:    noop,
  onReplace:      noop,
  onMoveToFolder: noop,
  onFindSimilar:  noop,
  onHistory:      noop,
  onUpdatePrompt: noop2,
};

export const WorkflowContext = createContext<WorkflowHandlers>(defaultHandlers);

export function useWorkflow(): WorkflowHandlers {
  return useContext(WorkflowContext);
}
