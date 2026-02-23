import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

@ValidatorConstraint({ name: 'SalaryRange', async: false })
export class SalaryRangeConstraint implements ValidatorConstraintInterface {
    validate(value: any, args: ValidationArguments):
        Promise<boolean> | boolean {
        const obj = args.object as any

        if (
            obj.expectedSalaryMax !== undefined &&
            obj.expectedSalaryMin !== undefined
        ) {
            return obj.expectedSalaryMin <= obj.expectedSalaryMax
        }

        return true
    }

    defaultMessage(): string {
        return "Lương tối thiểu không được lớn hơn lương tối đa"
    }
}

export function IsSalaryRangeValid(
    validationOptions?: ValidationOptions
) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: SalaryRangeConstraint
        })
    }
}