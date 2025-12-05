import React from 'react';
import { useAppContext } from '../contexts/AppContext';

interface FormattedInputProps extends React.ComponentProps<'input'> {
    value: string | number | readonly string[] | undefined;
}

const FormattedInput: React.FC<FormattedInputProps> = ({ value, onChange, className, ...props }) => {
    const { isNumberFormattingEnabled } = useAppContext();

    if (!isNumberFormattingEnabled) {
        return <input value={value} onChange={onChange} className={className} {...props} />;
    }

    // Format for display
    const format = (val: string) => {
        if (!val) return '';
        const parts = val.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join('.');
    };

    const displayValue = format(String(value));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (onChange) {
            // Remove commas before passing to parent handler
            const rawValue = e.target.value.replace(/,/g, '');
            
            // Clone event to avoid mutation issues
            const newEvent = {
                ...e,
                target: {
                    ...e.target,
                    value: rawValue
                }
            };
            onChange(newEvent as any);
        }
    };

    return (
        <input
            {...props}
            type="text"
            value={displayValue}
            onChange={handleChange}
            className={className}
        />
    );
};

export default FormattedInput;