import React, { Component, CSSProperties, ReactNode } from 'react';

// Define the Viewport type/interface if not already globally available or imported
// This is a placeholder based on usage in getWrapperStyle
interface DialogViewport {
    x: number;
    y: number;
    width: number | string; // width/height can be string (e.g., "100%") or number
    height: number | string;
}

export interface DialogButton {
    label: string;
    onClick: () => void;
    // Add other properties if buttons can have them (e.g., className, disabled)
}

export interface DialogProps {
    hidden?: boolean;
    className?: string;
    children?: ReactNode;
    buttons: DialogButton[];
    viewport: DialogViewport; // This prop is used by getWrapperStyle
    zIndex?: number;
    // any other props Dialog might accept
}

export class Dialog extends Component<DialogProps> {
    render() {
        console.log('[Dialog] render called with props:', this.props);
        if (this.props.hidden) {
            console.log('[Dialog] Dialog is hidden, returning null');
            return null;
        }

        console.log('[Dialog] Rendering dialog with className:', this.props.className);
        return (
            <div style={this.getWrapperStyle()}>
                <div className={`message-box ${this.props.className || ''}`}>
                    <div className="message-box-content">
                        {this.props.children}
                    </div>
                    <div className="message-box-footer">
                        {this.props.buttons.map((button, index) => this.renderButton(button, index))}
                    </div>
                </div>
            </div>
        );
    }

    renderButton(button: DialogButton, index: number) {
        return (
            <button key={index} className="dialog-button" onClick={button.onClick}>
                {button.label}
            </button>
        );
    }

    getWrapperStyle(): CSSProperties {
        const { viewport, zIndex } = this.props;
        console.log('[Dialog] getWrapperStyle called with viewport:', viewport, 'zIndex:', zIndex);
        const style: CSSProperties = {
            position: 'absolute',
            top: viewport.y,
            left: viewport.x,
            width: viewport.width,
            height: viewport.height,
            zIndex: zIndex || 10001, // Higher than MockSplashScreen's 10000
            // Add debug styles to make dialog visible
            backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        };
        console.log('[Dialog] Computed wrapper style:', style);
        return style;
    }
}

// If Dialog needs to be a default export based on original System.register
// export default Dialog; 
// However, named export is generally cleaner with TypeScript.
