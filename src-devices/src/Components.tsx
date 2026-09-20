// The module the ioBroker.devices host loads through Module Federation. It picks the component
// by the name declared in `common.deviceWidgets.components[].name` of io-package.json, so the
// keys here and the names there must match.
import DwdWarningsComponent from './DwdWarningsComponent';

export default { DwdWarningsComponent };
