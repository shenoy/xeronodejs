"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceComponent = void 0;
const core_1 = require("@angular/core");
let BalanceComponent = class BalanceComponent {
    constructor(http) {
        this.http = http;
    }
    ngOnInit() {
        this.http.getData().subscribe((data) => {
            this.reports = data;
            console.log(this.reports);
        });
    }
};
BalanceComponent = __decorate([
    core_1.Component({
        selector: 'app-balance',
        templateUrl: './balance.component.html',
        styleUrls: ['./balance.component.scss'],
    })
], BalanceComponent);
exports.BalanceComponent = BalanceComponent;
//# sourceMappingURL=balance.component.js.map