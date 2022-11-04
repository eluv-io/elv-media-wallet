const stripeSupportedCountries = [["US","United States of America"], ["AR","Argentina"],["AU","Australia"],["AT","Austria"],["BE","Belgium"],["BO","Bolivia"],["BG","Bulgaria"],["CA","Canada"],["CL","Chile"],["CO","Colombia"],["CR","Costa Rica"],["HR","Croatia"],["CY","Cyprus"],["CZ","Czech Republic"],["DK","Denmark"],["DO","Dominican Republic"],["EG","Egypt"],["EE","Estonia"],["FI","Finland"],["FR","France"],["GM","Gambia"],["DE","Germany"],["GR","Greece"],["HK","Hong Kong"],["HU","Hungary"],["IS","Iceland"],["IN","India"],["ID","Indonesia"],["IE","Ireland"],["IL","Israel"],["IT","Italy"],["KE","Kenya"],["LV","Latvia"],["LI","Liechtenstein"],["LT","Lithuania"],["LU","Luxembourg"],["MT","Malta"],["MX","Mexico"],["NL","Netherlands"],["NZ","New Zealand"],["NO","Norway"],["PY", "Paraguay"],["PE","Peru"],["PH","Phillipines"],["PL","Poland"],["PT","Portugal"],["RO","Romania"],["SA","Saudi Arabia"],["RS","Serbia"],["SG","Singapore"],["SK","Slovakia"],["SI","Slovenia"],["ZA","South Africa"],["KR","South Korea"],["ES","Spain"],["SE","Sweden"],["CH","Switzerland"],["TH","Thailand"],["TT","Trinidad & Tobago"],["TR","Turkey"],["AE","United Arab Emirates"],["GB","United Kingdom"],["UY", "Uruguay"]];
const ebanxSupportedCountries = [
  ["AR", "Argentina"],
  ["BO", "Bolivia"],
  ["BR", "Brazil"],
  ["CL", "Chile"],
  ["CO", "Colombia"],
  ["EC", "Ecuador"],
  ["SV", "El Salvador"],
  ["GT", "Guatemala"],
  ["MX", "Mexico"],
  ["PA", "Panama"],
  ["PY", "Paraguay"],
  ["PE", "Peru"],
  ["UY", "Uruguay"]
];

export default {
  stripe: stripeSupportedCountries,
  ebanx: ebanxSupportedCountries
};
