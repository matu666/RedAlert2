export class UiComponent {
  protected props: any;
  protected uiObject: any;

  constructor(props: any) {
    this.props = props;
    this.uiObject = this.createUiObject(props);
  }

  protected createUiObject(props: any): any {
    throw new Error('Method not implemented.');
  }

  getUiObject(): any {
    return this.uiObject;
  }
}