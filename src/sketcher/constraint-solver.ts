/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ArcObject } from '../scene/arc-object';
import { CircleObject } from '../scene/circle-object';
import { Point } from '../scene/point';
import { SceneObject } from '../scene/scene-object';

import * as c from 'cassowary';

/**
 * A simple iterative non-linear constraint solver using gradient descent.
 * It's designed to work on a small number of constraints after an initial
 * guess is provided by a linear solver like Cassowary.
 */
class GradientDescentSolver {
    private constraints: { errorFunc: () => number, vars: { point: Point, grad: (p: Point) => { dx: number, dy: number }}[] }[] = [];
    private learningRate = 0.1;
    private iterations = 50;

    /**
     * Adds a non-linear constraint to the solver.
     * @param errorFunc A function that returns the current error (how much the constraint is violated).
     * @param vars An array of variables (points) involved in this constraint and their gradient functions.
     */
    addConstraint(errorFunc: () => number, vars: { point: Point, grad: (p: Point) => { dx: number, dy: number }}[]): void {
        this.constraints.push({ errorFunc, vars });
    }

    /**
     * Iteratively solves the constraints to minimize the total error.
     */
    solve(): void {
        for (let i = 0; i < this.iterations; i++) {
            let totalError = 0;
            this.constraints.forEach(({ errorFunc, vars }) => {
                const error = errorFunc();
                totalError += Math.abs(error);

                if (Math.abs(error) < 1e-6) return;

                // Move each variable along the negative gradient of the error function
                vars.forEach(v => {
                    const gradient = v.grad(v.point);
                    v.point.x -= this.learningRate * error * gradient.dx;
                    v.point.y -= this.learningRate * error * gradient.dy;
                });
            });

            // Stop if the solution has converged
            if (totalError < 1e-6) {
                break;
            }
        }
    }
    
    /**
     * Clears all constraints from the solver.
     */
    clear(): void {
        this.constraints = [];
    }
}

export class ConstraintSolver {
    private linearSolver = new c.SimplexSolver();
    private nonLinearSolver = new GradientDescentSolver();
    private pointToVarMap = new Map<Point, { x: any, y: any }>();

    /**
     * Додає точку до солвера, створюючи для неї змінні.
     * @param point Точка для додавання.
     */
    public addPoint(point: Point): void {
        if (this.pointToVarMap.has(point)) return;

        const xVar = new c.Variable({ value: point.x });
        const yVar = new c.Variable({ value: point.y });
        this.pointToVarMap.set(point, { x: xVar, y: yVar });
    }

    /**
     * Додає обмеження горизонтальності для відрізка.
     * @param p1 Початкова точка відрізка.
     * @param p2 Кінцева точка відрізка.
     */
    public addHorizontalConstraint(p1: Point, p2: Point): void {
        const p1Vars = this.pointToVarMap.get(p1);
        const p2Vars = this.pointToVarMap.get(p2);
        if (p1Vars && p2Vars) {
            const eq = new c.Equation(p1Vars.y, p2Vars.y);
            this.linearSolver.addConstraint(eq);
        }
    }
    
    /**
     * Додає обмеження вертикальності для відрізка.
     * @param p1 Початкова точка відрізка.
     * @param p2 Кінцева точка відрізка.
     */
    public addVerticalConstraint(p1: Point, p2: Point): void {
        const p1Vars = this.pointToVarMap.get(p1);
        const p2Vars = this.pointToVarMap.get(p2);
        if (p1Vars && p2Vars) {
            const eq = new c.Equation(p1Vars.x, p2Vars.x);
            this.linearSolver.addConstraint(eq);
        }
    }

    /**
     * Додає обмеження паралельності для двох відрізків.
     * @param p1 Початкова точка першого відрізка.
     * @param p2 Кінцева точка першого відрізка.
     * @param refP3 Початкова точка опорного відрізка.
     * @param refP4 Кінцева точка опорного відрізка.
     */
    public addParallelConstraint(p1: Point, p2: Point, refP3: Point, refP4: Point): void {
        const p1Vars = this.pointToVarMap.get(p1);
        const p2Vars = this.pointToVarMap.get(p2);
        if (p1Vars && p2Vars) {
            const C1 = refP4.x - refP3.x; // constant
            const C2 = refP4.y - refP3.y; // constant
            // (p2.y - p1.y) * C1 - (p2.x - p1.x) * C2 = 0
            const y2_minus_y1 = new c.Expression(p2Vars.y).minus(p1Vars.y);
            const x2_minus_x1 = new c.Expression(p2Vars.x).minus(p1Vars.x);
            
            const term1 = y2_minus_y1.times(C1);
            const term2 = x2_minus_x1.times(C2);
            
            const finalExpr = term1.minus(term2);
            const eq = new c.Equation(finalExpr, 0);
            this.linearSolver.addConstraint(eq);
        }
    }

    /**
     * Додає обмеження перпендикулярності для двох відрізків.
     * @param p1 Початкова точка першого відрізка.
     * @param p2 Кінцева точка першого відрізка.
     * @param refP3 Початкова точка опорного відрізка.
     * @param refP4 Кінцева точка опорного відрізка.
     */
    public addPerpendicularConstraint(p1: Point, p2: Point, refP3: Point, refP4: Point): void {
        const p1Vars = this.pointToVarMap.get(p1);
        const p2Vars = this.pointToVarMap.get(p2);
        if (p1Vars && p2Vars) {
            const C1 = refP4.x - refP3.x; // constant
            const C2 = refP4.y - refP3.y; // constant
            // (p2.y - p1.y) * C2 + (p2.x - p1.x) * C1 = 0
            const y2_minus_y1 = new c.Expression(p2Vars.y).minus(p1Vars.y);
            const x2_minus_x1 = new c.Expression(p2Vars.x).minus(p1Vars.x);

            const term1 = y2_minus_y1.times(C2);
            const term2 = x2_minus_x1.times(C1);

            const finalExpr = term1.plus(term2);
            const eq = new c.Equation(finalExpr, 0);
            this.linearSolver.addConstraint(eq);
        }
    }

    /**
     * Додає обмеження кута між двома відрізками.
     * @param p1 Початкова точка першого відрізка.
     * @param p2 Кінцева точка першого відрізка.
     * @param refP3 Початкова точка опорного відрізка.
     * @param refP4 Кінцева точка опорного відрізка.
     * @param angleDegrees Цільовий кут у градусах.
     * @returns `true` якщо обмеження було успішно додано.
     */
    public addAngleConstraint(p1: Point, p2: Point, refP3: Point, refP4: Point, angleDegrees: number): boolean {
        const p1Vars = this.pointToVarMap.get(p1);
        const p2Vars = this.pointToVarMap.get(p2);
        if (!p1Vars || !p2Vars) return false;

        const ref_dx = refP4.x - refP3.x;
        const ref_dy = refP4.y - refP3.y;

        if (Math.abs(ref_dx) < 1e-9 && Math.abs(ref_dy) < 1e-9) {
            return false; // Reference segment is a point
        }

        const refAngle = Math.atan2(ref_dy, ref_dx);
        const targetAngle = refAngle + (angleDegrees * Math.PI / 180);
        
        const A = -Math.sin(targetAngle);
        const B = Math.cos(targetAngle);

        // Equation: A*(p2.x - p1.x) + B*(p2.y - p1.y) = 0
        const x2_minus_x1 = new c.Expression(p2Vars.x).minus(p1Vars.x);
        const y2_minus_y1 = new c.Expression(p2Vars.y).minus(p1Vars.y);

        const term1 = x2_minus_x1.times(A);
        const term2 = y2_minus_y1.times(B);
        
        const expr = term1.plus(term2);
        const eq = new c.Equation(expr, 0);
        this.linearSolver.addConstraint(eq);

        return true;
    }

    /**
     * Додає нелінійне обмеження довжини для будь-якого відрізка.
     * @param p1 Початкова точка відрізка.
     * @param p2 Кінцева точка відрізка.
     * @param length Цільова довжина.
     * @returns `true` якщо обмеження було успішно додано.
     */
    public addLengthConstraint(p1: Point, p2: Point, length: number): boolean {
        if (!this.pointToVarMap.has(p1) || !this.pointToVarMap.has(p2)) return false;

        const errorFunc = () => {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const currentLength = Math.sqrt(dx * dx + dy * dy);
            return currentLength - length;
        };

        const vars = [
            {
                point: p1,
                grad: () => {
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const currentLength = Math.sqrt(dx * dx + dy * dy);
                    if (currentLength < 1e-9) return { dx: 0, dy: 0 };
                    return { dx: dx / currentLength, dy: dy / currentLength };
                }
            },
            {
                point: p2,
                grad: () => {
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const currentLength = Math.sqrt(dx * dx + dy * dy);
                    if (currentLength < 1e-9) return { dx: 0, dy: 0 };
                    return { dx: dx / currentLength, dy: dy / currentLength };
                }
            }
        ];

        this.nonLinearSolver.addConstraint(errorFunc, vars);
        return true;
    }

    /**
     * Додає обмеження дотичності між двома об'єктами.
     * @param obj1 Перший об'єкт (коло, дуга або відрізок).
     * @param obj2 Другий об'єкт (опціонально для лінія-коло).
     * @returns `true` якщо обмеження було успішно додано.
     */
    public addTangentConstraint(obj1: SceneObject, obj2?: SceneObject, seg1?: { p1: Point, p2: Point }, seg2?: { p1: Point, p2: Point }): boolean {
        const o1isCircle = obj1 instanceof CircleObject || obj1 instanceof ArcObject;
        const o2isCircle = obj2 instanceof CircleObject || obj2 instanceof ArcObject;
    
        if (o1isCircle && o2isCircle) {
            const c1 = obj1 as CircleObject | ArcObject;
            const c2 = obj2 as CircleObject | ArcObject;
            return this.addLengthConstraint(c1.center, c2.center, c1.radius + c2.radius);
        } else if (o1isCircle && seg2) {
            return this.addLineCircleTangent(obj1 as CircleObject | ArcObject, seg2.p1, seg2.p2);
        } else if (o2isCircle && seg1) {
            return this.addLineCircleTangent(obj2 as CircleObject | ArcObject, seg1.p1, seg1.p2);
        }
        
        return false;
    }

    /**
     * Допоміжний метод для додавання нелінійного обмеження дотичності між лінією та колом/дугою.
     * @param circle Коло або дуга.
     * @param p1 Початкова точка відрізка.
     * @param p2 Кінцева точка відрізка.
     * @returns `true` якщо обмеження було успішно додано.
     */
    private addLineCircleTangent(circle: CircleObject | ArcObject, p1: Point, p2: Point): boolean {
        const c = circle.center;
        const r = circle.radius;
    
        const errorFunc = () => {
            const num_sq = Math.pow((p1.y-p2.y)*c.x + (p2.x-p1.x)*c.y + p1.x*p2.y - p2.x*p1.y, 2);
            const den_sq = Math.pow(p2.x-p1.x, 2) + Math.pow(p2.y-p1.y, 2);
            if (den_sq < 1e-9) return 0; // Avoid division by zero for zero-length segments
            return num_sq - (r*r) * den_sq;
        };
    
        const vars = [
            {
                point: c,
                grad: () => {
                    const num = (p1.y-p2.y)*c.x + (p2.x-p1.x)*c.y + p1.x*p2.y - p2.x*p1.y;
                    return { 
                        dx: 2 * num * (p1.y-p2.y), 
                        dy: 2 * num * (p2.x-p1.x)
                    };
                }
            },
            {
                point: p1,
                grad: () => {
                    const num = (p1.y-p2.y)*c.x + (p2.x-p1.x)*c.y + p1.x*p2.y - p2.x*p1.y;
                    return { 
                        dx: 2 * num * (p2.y - c.y) + 2 * r * r * (p2.x - p1.x),
                        dy: 2 * num * (c.x - p2.x) + 2 * r * r * (p2.y - p1.y)
                    };
                }
            },
            {
                point: p2,
                grad: () => {
                    const num = (p1.y-p2.y)*c.x + (p2.x-p1.x)*c.y + p1.x*p2.y - p2.x*p1.y;
                    return { 
                        dx: 2 * num * (c.y - p1.y) - 2 * r * r * (p2.x - p1.x),
                        dy: 2 * num * (p1.x - c.x) - 2 * r * r * (p2.y - p1.y)
                    };
                }
            },
        ];
    
        this.nonLinearSolver.addConstraint(errorFunc, vars);
        return true;
    }

    /**
     * Починає режим редагування точки.
     * @param point Точка для редагування.
     */
    public startEdit(point: Point): void {
        const vars = this.pointToVarMap.get(point);
        if (vars) {
            this.linearSolver.addEditVar(vars.x, c.Strength.medium);
            this.linearSolver.addEditVar(vars.y, c.Strength.medium);
        }
    }

    /**
     * Пропонує нове значення для точки, що редагується.
     * @param point Точка для редагування.
     * @param newCoords Нові бажані координати.
     */
    public suggestValue(point: Point, newCoords: Point): void {
        const vars = this.pointToVarMap.get(point);
        if (vars) {
            this.linearSolver.suggestValue(vars.x, newCoords.x);
            this.linearSolver.suggestValue(vars.y, newCoords.y);
        }
    }

    /**
     * Завершує режим редагування точки.
     * @param point Точка, редагування якої завершено.
     */
    public endEdit(point: Point): void {
         const vars = this.pointToVarMap.get(point);
        if (vars) {
            // Note: Cassowary.js may not have removeEditVar, so we skip it for now
            // this.linearSolver.removeEditVar(vars.x);
            // this.linearSolver.removeEditVar(vars.y);
        }
    }

    /**
     * Очищає всі обмеження та змінні з солвера.
     */
    public clear(): void {
        this.linearSolver = new c.SimplexSolver();
        this.nonLinearSolver.clear();
        this.pointToVarMap.clear();
    }

    /**
     * Вирішує систему обмежень, спочатку лінійних, потім нелінійних.
     */
    public solve(): void {
        // First, solve the linear system to get a good initial guess.
        this.linearSolver.solve();

        // Update the original Point objects with the solved values from the linear solver.
        for (const [point, vars] of this.pointToVarMap.entries()) {
            point.x = vars.x.value;
            point.y = vars.y.value;
        }
        
        // Now, iteratively solve the non-linear constraints starting from the linear solution.
        this.nonLinearSolver.solve();
    }
}
