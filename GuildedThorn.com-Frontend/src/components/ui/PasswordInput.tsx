import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@components/ui/Input";

interface PasswordInputProps {
    id: string;
    label: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
    id,
    label,
    placeholder,
    value,
    onChange,
}) => {
    const [visible, setVisible] = useState(false);

    return (
        <div className="mb-4 text-left">
            <label htmlFor={id} className="field-label">
                {label}
            </label>
            <div className="relative">
                <Input
                    type={visible ? "text" : "password"}
                    id={id}
                    name={id}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className="pr-10"
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                >
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
};

export default PasswordInput;
