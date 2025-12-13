import { useState } from 'react'
import { Select, Adapt, Sheet } from 'tamagui'
import { ChevronDown, Check } from '@tamagui/lucide-icons'

const JOB_LEVELS = [
  { label: 'Entry Level', value: 'entry-level' },
  { label: 'Junior', value: 'junior' },
  { label: 'Mid-Level', value: 'mid-level' },
  { label: 'Senior', value: 'senior' },
  { label: 'Lead', value: 'lead' },
  { label: 'Staff', value: 'staff' },
  { label: 'Principal', value: 'principal' },
  { label: 'Manager', value: 'manager' },
  { label: 'Director', value: 'director' },
  { label: 'VP', value: 'vp' },
  { label: 'C-Level', value: 'c-level' },
]

type Props = {
  jobLevel: string
  setJobLevel: (value: string) => void
}

export function JobLevelPicker({ jobLevel, setJobLevel }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <Select
      value={jobLevel}
      open={open}
      onOpenChange={setOpen}
      onValueChange={(value) => {
        setJobLevel(value)
        setOpen(false) // ✅ CLOSE AFTER SELECTION
      }}
    >
      {/* ---------- Trigger ---------- */}
      <Select.Trigger
        width="100%"
        height={50}
        bg="rgba(0,0,0,0.3)"
        borderColor="rgba(255,255,255,0.2)"
        iconAfter={<ChevronDown size={18} color="white" />}
        pressStyle={{ opacity: 0.85 }}
        focusStyle={{
          borderColor: '#60a5fa',
          bg: 'rgba(0,0,0,0.4)',
        }}
      >
        <Select.Value placeholder="Select job level" />
      </Select.Trigger>

      {/* ---------- Mobile Sheet ---------- */}
      <Adapt when="maxMd" platform="touch">
        <Sheet modal dismissOnSnapToBottom animation="medium">
          <Sheet.Frame>
            <Sheet.ScrollView>
              <Adapt.Contents />
            </Sheet.ScrollView>
          </Sheet.Frame>
          <Sheet.Overlay
            bg="$shadowColor"
            animation="lazy"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
        </Sheet>
      </Adapt>

      {/* ---------- Dropdown Content ---------- */}
        <Select.Content zIndex={200000}>
          <Select.Viewport>
            <Select.Group>
              <Select.Label>Select Level</Select.Label>

              {JOB_LEVELS.map((level, index) => (
                <Select.Item
                  key={level.value}
                  index={index}
                  value={level.value}
                >
                  <Select.ItemText>{level.value}</Select.ItemText>
                  <Select.ItemIndicator marginLeft="auto">
                    <Check size={16} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Viewport>
        </Select.Content>
    </Select>
  )
}
