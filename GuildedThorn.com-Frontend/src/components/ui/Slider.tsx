import React from "react";

interface SliderProps {
    /** The value array – first element is the thumb’s numeric value */
    value: number[];
    min?: number;
    max?: number;
    step?: number;
    /** Callback passes `[value]` to match Radix‑like signature */
    onValueChange: (val: number[]) => void;
    className?: string;
}

/**
 * Tailwind‑styled single‑thumb slider that mimics Radix UI’s onValueChange signature.
 * The parent component keeps `value` as `[number]` so `handleVolumeChange(val:number[])` works unmodified.
 */
const Slider: React.FC<SliderProps> = ({
                                           value,
                                           min = 0,
                                           max = 100,
                                           step = 1,
                                           onValueChange,
                                           className = "",
                                       }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onValueChange([Number(e.target.value)]);
    };

    return (
        <input
            type="range"
            value={value[0]}
            min={min}
            max={max}
            step={step}
            onChange={handleChange}
            className={`w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600 ${className}`}
        />
    );
};

export default Slider;
