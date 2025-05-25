export class UiComponent {
  constructor(props) {
    this.props = props;
    this.uiObject = this.createUiObject(props);
  }

  getUiObject() {
    return this.uiObject;
  }
} 