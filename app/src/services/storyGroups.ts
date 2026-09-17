import type { Story } from '../domain/types';

export type StoryGroup = {
  userId: string;
  frames: Story[];
  hasUnseen: boolean;
};

/** Group the filtered story list without changing its batch/selection order. */
export function groupStories(visible: readonly Story[]): StoryGroup[] {
  const groups = new Map<string, StoryGroup>();
  for (const frame of visible) {
    let group = groups.get(frame.userId);
    if (!group) {
      group = { userId: frame.userId, frames: [], hasUnseen: false };
      groups.set(frame.userId, group);
    }
    group.frames.push(frame);
    group.hasUnseen ||= !frame.seenByMe;
  }
  return [...groups.values()];
}
