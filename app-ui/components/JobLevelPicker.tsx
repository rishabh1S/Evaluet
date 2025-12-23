import { useState } from 'react'
import { Select, Adapt, Sheet } from 'tamagui'
import { ChevronDown, Check } from '@tamagui/lucide-icons'

const JOB_LEVELS = [
  { label: 'Intern / Trainee', value: 'Intern' },
  { label: 'Entry Level (0–1 years)', value: 'Entry Level' },
  { label: 'Junior (1–3 years)', value: 'Junior' },
  { label: 'Mid-Level (3–6 years)', value: 'Mid-Level' },
  { label: 'Senior (6–10 years)', value: 'Senior' },
  { label: 'Lead / Team Lead', value: 'Lead / Team Lead' },
  { label: 'Manager', value: 'Manager' },
  { label: 'Senior Manager', value: 'Senior Manager' },
  { label: 'Director / Head', value: 'Director / Head' },
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
        setOpen(false)
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
          borderColor: '#351B98',
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
                  <Select.ItemText>{level.label}</Select.ItemText>
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
