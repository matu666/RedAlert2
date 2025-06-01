import React, { useState, useEffect, useRef } from 'react';
import classNames from 'classnames';
import { contains } from '@/util/dom';

interface SelectProps {
  initialValue: any;
  disabled?: boolean;
  tooltip?: string;
  className?: string;
  onSelect?: (value: any) => void;
  labelStyle?: (value: any) => React.CSSProperties;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  initialValue,
  disabled,
  tooltip,
  className,
  onSelect,
  labelStyle,
  children,
}) => {
  const [value, setValue] = useState(() => initialValue);
  const [hoverValue, setHoverValue] = useState(() => initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== initialValue) {
      setValue(initialValue);
      setHoverValue(value);
    }
  }, [initialValue]);

  useEffect(() => {
    if (isOpen) {
      setHoverValue(value);
      const handleClickOutside = (e: MouseEvent) => {
        if (!contains(containerRef.current, e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isOpen]);

  const selectedChild = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.props.value === value
  );

  return (
    <div style={{ display: 'inline-block', verticalAlign: 'middle' }} className={className}>
      <div
        className={classNames('select', { disabled })}
        data-r-tooltip={tooltip}
        ref={containerRef}
      >
        <div className="select-value" onClick={() => !disabled && setIsOpen(!isOpen)}>
          <div style={labelStyle?.(value)}>
            {React.isValidElement(selectedChild) ? selectedChild.props.label : ''}
          </div>
        </div>
        {isOpen && (
          <div className="select-layer">
            {React.Children.map(children, (child) => {
              if (!React.isValidElement(child)) return null;
              const childValue = child.props.value;
              const isDisabled = child.props.disabled;
              return (
                <div onMouseEnter={() => !isDisabled && setHoverValue(childValue)}>
                  {React.cloneElement(child, {
                    selected: childValue === hoverValue,
                    labelStyle: labelStyle?.(childValue),
                    onClick: () => {
                      setValue(childValue);
                      setHoverValue(childValue);
                      onSelect?.(childValue);
                      setIsOpen(false);
                    },
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};