/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Minimal type declarations for cassowary.js, loaded via CDN.
declare namespace c {
    class Expression {
        constructor(variable?: Variable | number);
        plus(other: Expression | Variable | number): Expression;
        minus(other: Expression | Variable | number): Expression;
        times(other: Expression | Variable | number): Expression;
        divide(other: Expression | Variable | number): Expression;
    }
    class Variable extends Expression {
        constructor(options?: { value: number });
        value: number;
    }

    class Equation {
        constructor(left: Expression | Variable, right?: Expression | Variable | number, strength?: any);
    }

    class SimplexSolver {
        constructor();
        addConstraint(constraint: any): void;
        addEditVar(variable: Variable, strength?: any): void;
        removeEditVar(variable: Variable): void;
        suggestValue(variable: Variable, value: number): void;
        solve(): void;
    }

    const Strength: {
        required: any;
        strong: any;
        medium: any;
        weak: any;
    };
}