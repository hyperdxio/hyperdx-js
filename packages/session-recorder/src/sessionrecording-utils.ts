/**
Copyright 2023 DeploySentinel, Inc.

Copyright 2020 Posthog / Hiberly, Inc.

Copyright 2015 Mixpanel, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this work except in compliance with the License.
You may obtain a copy of the License below, or at:

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Source: https://github.com/PostHog/posthog-js/blob/b6e3855a7f4339fba011e9a747be67c3a9c78955/src/extensions/sessionrecording-utils.ts
*/

import type {
  KeepIframeSrcFn,
  RecordPlugin,
  SamplingStrategy,
  blockClass,
  hooksParam,
  maskTextClass,
  mutationCallbackParam,
} from '@rrweb/types';
import type {
  MaskInputOptions,
  MaskInputFn,
  MaskTextFn,
  SlimDOMOptions,
  DataURLOptions,
} from 'rrweb-snapshot';
import type { record } from 'rrweb';
import type { eventWithTime } from 'rrweb/typings/types';

type rrwebRecord = typeof record;

export const replacementImageURI =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSJibGFjayIvPgo8cGF0aCBkPSJNOCAwSDE2TDAgMTZWOEw4IDBaIiBmaWxsPSIjMkQyRDJEIi8+CjxwYXRoIGQ9Ik0xNiA4VjE2SDhMMTYgOFoiIGZpbGw9IiMyRDJEMkQiLz4KPC9zdmc+Cg==';

export const FULL_SNAPSHOT_EVENT_TYPE = 2;
export const META_EVENT_TYPE = 4;
export const INCREMENTAL_SNAPSHOT_EVENT_TYPE = 3;
export const PLUGIN_EVENT_TYPE = 6;
export const MUTATION_SOURCE_TYPE = 0;

export const MAX_MESSAGE_SIZE = 5000000; // ~5mb

export declare type recordOptions<T> = {
  emit?: (e: T, isCheckout?: boolean) => void;
  checkoutEveryNth?: number;
  checkoutEveryNms?: number;
  blockClass?: blockClass;
  blockSelector?: string;
  ignoreClass?: string;
  maskTextClass?: maskTextClass;
  maskTextSelector?: string;
  maskAllInputs?: boolean;
  maskInputOptions?: MaskInputOptions;
  maskInputFn?: MaskInputFn;
  maskTextFn?: MaskTextFn;
  slimDOMOptions?: SlimDOMOptions | 'all' | true;
  ignoreCSSAttributes?: Set<string>;
  inlineStylesheet?: boolean;
  hooks?: hooksParam;
  // packFn?: PackFn
  sampling?: SamplingStrategy;
  dataURLOptions?: DataURLOptions;
  recordCanvas?: boolean;
  recordCrossOriginIframes?: boolean;
  recordAfter?: 'DOMContentLoaded' | 'load';
  userTriggeredOnInput?: boolean;
  collectFonts?: boolean;
  inlineImages?: boolean;
  plugins?: RecordPlugin[];
  mousemoveWait?: number;
  keepIframeSrcFn?: KeepIframeSrcFn;
  // errorHandler?: ErrorHandler
};

/*
 * Check whether a data payload is nearing 5mb. If it is, it checks the data for
 * data URIs (the likely culprit for large payloads). If it finds data URIs, it either replaces
 * it with a generic image (if it's an image) or removes it.
 * @data {object} the rr-web data object
 * @returns {object} the rr-web data object with data uris filtered out
 */
export function ensureStringifiedMaxMessageSize(
  stringifiedData: string,
): string {
  // Note: with compression, this limit may be able to be increased
  // but we're assuming most of the size is from a data uri which
  // is unlikely to be compressed further
  if (stringifiedData.length > MAX_MESSAGE_SIZE) {
    // Regex that matches the pattern for a dataURI with the shape 'data:{mime type};{encoding},{data}'. It:
    // 1) Checks if the pattern starts with 'data:' (potentially, not at the start of the string)
    // 2) Extracts the mime type of the data uri in the first group
    // 3) Determines when the data URI ends.Depending on if it's used in the src tag or css, it can end with a ) or "
    const dataURIRegex = /data:([\w/\-.]+);(\w+),([^)"]*)/gim;
    const matches = stringifiedData.matchAll(dataURIRegex);
    for (const match of matches) {
      if (match[1].toLocaleLowerCase().slice(0, 6) === 'image/') {
        stringifiedData = stringifiedData.replace(
          match[0],
          replacementImageURI,
        );
      } else {
        stringifiedData = stringifiedData.replace(match[0], '');
      }
    }
  }

  return stringifiedData;
}

export class MutationRateLimiter {
  private bucketSize = 100;
  private refillRate = 10;
  private mutationBuckets: Record<string, number> = {};
  private loggedTracker: Record<string, boolean> = {};

  constructor(
    private readonly rrweb: rrwebRecord,
    private readonly options: {
      bucketSize?: number;
      refillRate?: number;
      onBlockedNode?: (id: number, node: Node | null) => void;
    } = {},
  ) {
    this.refillRate = this.options.refillRate ?? this.refillRate;
    this.bucketSize = this.options.bucketSize ?? this.bucketSize;
    setInterval(() => {
      this.refillBuckets();
    }, 1000);
  }

  private refillBuckets = () => {
    Object.keys(this.mutationBuckets).forEach((key) => {
      this.mutationBuckets[key] = this.mutationBuckets[key] + this.refillRate;

      if (this.mutationBuckets[key] >= this.bucketSize) {
        delete this.mutationBuckets[key];
      }
    });
  };

  private getNodeOrRelevantParent = (id: number): [number, Node | null] => {
    // For some nodes we know they are part of a larger tree such as an SVG.
    // For those we want to block the entire node, not just the specific attribute

    const node = this.rrweb.mirror.getNode(id);

    // Check if the node is an Element and then find the closest parent that is an SVG
    if (node?.nodeName !== 'svg' && node instanceof Element) {
      const closestSVG = node.closest('svg');

      if (closestSVG) {
        // @ts-ignore
        return [this.rrweb.mirror.getId(closestSVG), closestSVG];
      }
    }

    return [id, node];
  };

  private numberOfChanges = (data: Partial<mutationCallbackParam>) => {
    return (
      (data.removes?.length ?? 0) +
      (data.attributes?.length ?? 0) +
      (data.texts?.length ?? 0) +
      (data.adds?.length ?? 0)
    );
  };

  public throttleMutations = (event: eventWithTime) => {
    if (
      event.type !== INCREMENTAL_SNAPSHOT_EVENT_TYPE ||
      event.data.source !== MUTATION_SOURCE_TYPE
    ) {
      return event;
    }

    const data = event.data as Partial<mutationCallbackParam>;
    const initialMutationCount = this.numberOfChanges(data);

    if (data.attributes) {
      // Most problematic mutations come from attrs where the style or minor properties are changed rapidly
      data.attributes = data.attributes.filter((attr) => {
        const [nodeId, node] = this.getNodeOrRelevantParent(attr.id);

        if (this.mutationBuckets[nodeId] === 0) {
          return false;
        }

        this.mutationBuckets[nodeId] =
          this.mutationBuckets[nodeId] ?? this.bucketSize;
        this.mutationBuckets[nodeId] = Math.max(
          this.mutationBuckets[nodeId] - 1,
          0,
        );

        if (this.mutationBuckets[nodeId] === 0) {
          if (!this.loggedTracker[nodeId]) {
            this.loggedTracker[nodeId] = true;
            this.options.onBlockedNode?.(nodeId, node);
          }
        }

        return attr;
      });
    }

    // Check if every part of the mutation is empty in which case there is nothing to do
    const mutationCount = this.numberOfChanges(data);

    if (mutationCount === 0 && initialMutationCount !== mutationCount) {
      // If we have modified the mutation count and the remaining count is 0, then we don't need the event.
      return;
    }
    return event;
  };
}
