export type AspectOption = {
  id: string
  label: string
  /** undefined = freeform crop (drag any rectangle) */
  value: number | undefined
}

export const CROP_ASPECT_OPTIONS: AspectOption[] = [
  { id: 'free', label: 'Free', value: undefined },
  { id: '1:1', label: '1:1', value: 1 },
  { id: '4:5', label: '4:5', value: 4 / 5 },
  { id: '3:2', label: '3:2', value: 3 / 2 },
  { id: '16:10', label: '16:10', value: 16 / 10 },
  { id: '16:9', label: '16:9', value: 16 / 9 },
]
