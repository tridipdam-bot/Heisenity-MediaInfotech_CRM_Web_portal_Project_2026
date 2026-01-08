export var VehicleType;
(function (VehicleType) {
    VehicleType["CAR"] = "CAR";
    VehicleType["BIKE"] = "BIKE";
    VehicleType["TRUCK"] = "TRUCK";
    VehicleType["VAN"] = "VAN";
})(VehicleType || (VehicleType = {}));
export var VehicleStatus;
(function (VehicleStatus) {
    VehicleStatus["AVAILABLE"] = "AVAILABLE";
    VehicleStatus["ASSIGNED"] = "ASSIGNED";
    VehicleStatus["MAINTENANCE"] = "MAINTENANCE";
    VehicleStatus["OUT_OF_SERVICE"] = "OUT_OF_SERVICE";
})(VehicleStatus || (VehicleStatus = {}));
export var BillStatus;
(function (BillStatus) {
    BillStatus["PENDING"] = "PENDING";
    BillStatus["APPROVED"] = "APPROVED";
    BillStatus["REJECTED"] = "REJECTED";
})(BillStatus || (BillStatus = {}));
