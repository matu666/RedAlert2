import React from 'react';

// Define the Viewport type/interface if not already globally available or imported
// This is a placeholder based on usage in getWrapperStyle
interface DialogViewport {
    x: number;
    y: number;
    width: number | string; // width/height can be string (e.g., "100%") or number
    height: number | string;
}

export interface ButtonConfig {
    label: string;
    onClick?: () => void;
}

export interface DialogProps {
    children?: React.ReactNode;
    className?: string;
    hidden?: boolean;
    buttons: ButtonConfig[];
    viewport: { x: number; y: number; width: number; height: number };
    zIndex?: number;
}

export class Dialog extends React.Component<DialogProps> {
    render(): React.ReactNode {
        if (this.props.hidden) {
            return null;
        }

        return React.createElement(
            'div',
            { style: this.getWrapperStyle() },
            React.createElement(
                'div',
                {
                    className: 'message-box ' + (this.props.className || '')
                },
                React.createElement(
                    'div',
                    { className: 'message-box-content' },
                    this.props.children
                ),
                React.createElement(
                    'div',
                    { className: 'message-box-footer' },
                    this.props.buttons.map((button, index) => this.renderButton(button, index))
                )
            )
        );
    }

    private renderButton(button: ButtonConfig, index: number): React.ReactElement {
        return React.createElement(
            'button',
            { 
                key: index, 
                className: 'dialog-button', 
                onClick: button.onClick 
            },
            button.label
        );
    }

    private getWrapperStyle(): React.CSSProperties {
        const viewport = this.props.viewport;
        return {
            position: 'absolute',
            top: viewport.y,
            left: viewport.x,
            width: viewport.width,
            height: viewport.height,
            zIndex: this.props.zIndex
        };
    }
}

// If Dialog needs to be a default export based on original System.register
// export default Dialog; 
// However, named export is generally cleaner with TypeScript.
