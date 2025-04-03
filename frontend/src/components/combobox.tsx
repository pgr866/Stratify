import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type ButtonProps = {
  defaultValue?: string;
  values?: string[];
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "logo";
  width?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  icon?: React.ReactNode;
};

export function Combobox({
  defaultValue = "",
  values = ["item1", "item2"],
  variant = "default",
  size = "default",
  width = "200px",
  placeholder = "Items",
  onChange,
  icon
}: Readonly<ButtonProps>) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(defaultValue)

  const handleSelect = (item: string) => {
    const newValue = item === value ? "" : item;
    setValue(newValue);
    setOpen(false);
    onChange?.(newValue);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          role="combobox"
          aria-expanded={open}
          style={{ width }}
          className="justify-between overflow-hidden font-normal">
          <span className="flex items-center gap-2">
            {icon && icon}
            {value || placeholder}
          </span>
          <ChevronDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">  
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} className="h-9" />
          <CommandList>
            <CommandEmpty>No {placeholder.toLowerCase()} found</CommandEmpty>
            <CommandGroup>
              {values.map((item) => (
                <CommandItem
                  key={item}
                  value={item}
                  onSelect={() => handleSelect(item)}>
                  {item}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === item ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
