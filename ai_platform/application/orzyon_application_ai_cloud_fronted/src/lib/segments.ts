import type { OrgSegment } from '../domain/types'

/** Grupos do seletor de organização. A Orzyon fica separada das organizações de governo e dos clientes. */
export type SegmentGroup = 'orzyon' | 'governo' | 'b2b'

export const GROUP_ORDER: SegmentGroup[] = ['orzyon', 'governo', 'b2b']

export const GROUP_LABEL: Record<SegmentGroup, string> = {
  orzyon: 'Orzyon',
  governo: 'Governo',
  b2b: 'Clientes B2B',
}

export const SEGMENT_GROUP: Record<OrgSegment, SegmentGroup> = {
  orzyon: 'orzyon',
  governo_civil: 'governo',
  governo_militar: 'governo',
  b2b: 'b2b',
}

export const SEGMENT_LABEL: Record<OrgSegment, string> = {
  orzyon: 'Orzyon',
  governo_civil: 'Governo civil',
  governo_militar: 'Governo militar',
  b2b: 'Cliente B2B',
}
