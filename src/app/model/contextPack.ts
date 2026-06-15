export type ContextPackDto = {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContextPackStatusDto = {
  totalCount: number;
  activeId: string | null;
};

export type ContextPackListDto = {
  packs: ContextPackDto[];
};
