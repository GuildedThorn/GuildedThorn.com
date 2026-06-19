import React from "react";
import { Input } from "@components/ui/Input";

interface TextInputProps {
    id: string;
    label: string;
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TextInput: React.FC<TextInputProps> = ({
    id,
    label,
    type = "text",
    placeholder,
    value,
    onChange,
}) => {
    return (
        <div className="mb-4 text-left">
            <label htmlFor={id} className="field-label">
                {label}
            </label>
            <Input
                type={type}
                id={id}
                name={id}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
            />
        </div>
    );
};

export default TextInput;
