import React from "react";

export class MenuButton extends React.Component {
  render() {
    const buttonConfig = this.props.buttonConfig;
    
    if (!buttonConfig) {
      return null;
    }

    return React.createElement(
      "div",
      {
        className: this.getClassName(buttonConfig),
        style: this.getStyle(),
        onMouseDown: (event) => this.onMouseDown(event),
        onMouseUp: (event) => this.onMouseUp(event),
        onClick: (event) => this.onClick(event),
        "data-r-tooltip": buttonConfig.tooltip,
      },
      buttonConfig.label,
    );
  }

  getClassName(buttonConfig) {
    let classes = ["menu-button"];
    if (buttonConfig.disabled) {
      classes.push("disabled");
    }
    return classes.join(" ");
  }

  getStyle() {
    const box = this.props.box;
    return {
      position: "absolute",
      left: box.x,
      top: box.y,
      width: box.width,
      height: box.height,
      lineHeight: box.height + 1 + "px",
    };
  }

  onMouseDown(event) {
    if (!this.props.buttonConfig.disabled && this.props.onMouseDown) {
      this.props.onMouseDown(event);
    }
  }

  onMouseUp(event) {
    if (!this.props.buttonConfig.disabled && this.props.onMouseUp) {
      this.props.onMouseUp(event);
    }
  }

  onClick(event) {
    if (!this.props.buttonConfig.disabled && this.props.onClick) {
      this.props.onClick(event);
    }
  }
} 