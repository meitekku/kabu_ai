import React, { useState } from 'react';
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock } from "lucide-react";
import * as SliderPrimitive from "@radix-ui/react-slider";

interface DateRangeSelectorProps {
  onTimeRangeSelect: (start: string, end: string) => void;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ onTimeRangeSelect }) => {
  const now = new Date();
  const [range, setRange] = useState([0, 48]);
  const [previewStartDate, setPreviewStartDate] = useState<Date>(() => subDays(now, 1));
  const [previewEndDate, setPreviewEndDate] = useState<Date>(now);
  const [buttonText, setButtonText] = useState("期間選択");
  const [isOpen, setIsOpen] = useState(false);

  const handleRangeChange = (newRange: number[]) => {
    setRange(newRange);
    const currentTime = new Date();
    const hoursFromStart = 48 - newRange[0];
    const hoursFromEnd = 48 - newRange[1];
    
    const newStartDate = new Date(currentTime.getTime() - (hoursFromStart * 60 * 60 * 1000));
    const newEndDate = new Date(currentTime.getTime() - (hoursFromEnd * 60 * 60 * 1000));
    
    setPreviewStartDate(newStartDate);
    setPreviewEndDate(newEndDate);
    updateButtonText(newStartDate, newEndDate);
  };

  const updateButtonText = (start: Date, end: Date) => {
    const diffInHours = Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours === 24) {
      setButtonText("過去24時間");
    } else if (diffInHours === 48) {
      setButtonText("過去48時間");
    } else {
      setButtonText(`${format(start, "MM/dd HH:mm")} - ${format(end, "MM/dd HH:mm")}`);
    }
  };

  const handleApply = () => {
    const currentTime = new Date();
    const hoursFromStart = 48 - range[0];
    const hoursFromEnd = 48 - range[1];
    
    const finalStartDate = new Date(currentTime.getTime() - (hoursFromStart * 60 * 60 * 1000));
    const finalEndDate = new Date(currentTime.getTime() - (hoursFromEnd * 60 * 60 * 1000));

    const formattedStartDate = format(finalStartDate, "yyyy-MM-dd HH:mm:ss");
    const formattedEndDate = format(finalEndDate, "yyyy-MM-dd HH:mm:ss");
    
    onTimeRangeSelect(formattedStartDate, formattedEndDate);
    setIsOpen(false);
  };

  const formatDateTime = (date: Date) => {
    return format(date, "MM/dd HH:mm");
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-48">
          <Clock className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <Card>
          <CardContent className="pt-4">
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <div className="text-sm">開始: {formatDateTime(previewStartDate)}</div>
                <div className="text-sm">終了: {formatDateTime(previewEndDate)}</div>
              </div>
              <div className="mb-4 relative pt-5">
                <SliderPrimitive.Root
                  className="relative flex w-full touch-none select-none items-center"
                  value={range}
                  onValueChange={handleRangeChange}
                  min={0}
                  max={48}
                  step={1}
                >
                  <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-100">
                    <SliderPrimitive.Range className="absolute h-full bg-blue-500" />
                  </SliderPrimitive.Track>
                  {range.map((value, index) => (
                    <SliderPrimitive.Thumb
                      key={index}
                      className="block h-5 w-5 rounded-full border-2 border-blue-500 bg-white ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                    />
                  ))}
                </SliderPrimitive.Root>
              </div>
            </div>
            <Button 
              className="w-full"
              onClick={handleApply}
            >
              決定
            </Button>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default DateRangeSelector;