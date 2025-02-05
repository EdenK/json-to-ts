import { getTypeStructure, optimizeTypeStructure } from "./get-type-structure";
import { Options } from "./model";
import { shim } from "es7-shim/es7-shim";
import { getInterfaceDescriptions, getInterfaceStringFromDescription } from "./get-interfaces";
import { getNames } from "./get-names";
import { isArray, isObject } from "./util";
import { appendFileSync, readFileSync, writeFileSync } from "fs";
shim();

export default function JsonToTS(json: any, userOptions?: Options): string[] {
  const defaultOptions: Options = {
    rootName: "RootObject",
    prefix: null,
  };
  const options = {
    ...defaultOptions,
    ...userOptions,
  };

  /**
   * Parsing currently works with (Objects) and (Array of Objects) not and primitive types and mixed arrays etc..
   * so we shall validate, so we dont start parsing non Object type
   */
  const isArrayOfObjects = isArray(json) && json.length > 0 && json.reduce((a, b) => a && isObject(b), true);

  if (!(isObject(json) || isArrayOfObjects)) {
    throw new Error("Only (Object) and (Array of Object) are supported");
  }

  const typeStructure = getTypeStructure(json);
  /**
   * due to merging array types some types are switched out for merged ones
   * so we delete the unused ones here
   */
  optimizeTypeStructure(typeStructure);

  const names = getNames(typeStructure, options.rootName).map((nameObj, i) => {
    if (options.prefix) {
      const rootType = typeStructure.types.find((type) => type.id === typeStructure.rootTypeId);
      const currentType = typeStructure.types.find((type) => type.id === nameObj.id);
      const shouldAddPrefix =
        (!currentType.arrayOfTypes ||
          currentType.arrayOfTypes.reduce((prev, cur) => {
            if (
              cur === "string" ||
              cur === "number" ||
              cur === "boolean" ||
              cur === "null" ||
              cur === "any" ||
              cur === "unknown"
            ) {
              return prev;
            }
            // debugger;
            return prev + 1;
          }, 0)) &&
        nameObj.name !== "any[]";
      if (shouldAddPrefix) {
        const prefixFromIndex = rootType?.arrayOfTypes ? 2 : 1;
        if (i >= prefixFromIndex) {
          nameObj.name = options.prefix + "_" + nameObj.name;
        }
      }
    }
    return nameObj;
  });

  return getInterfaceDescriptions(typeStructure, names).map(getInterfaceStringFromDescription);
}

(<any>JsonToTS).default = JsonToTS;
module.exports = JsonToTS;