/**
Copyright (c) 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../base/iteration_helpers.js");
require("./event_set.js");

'use strict';

global.tr.exportTo('tr.model', function() {
  function getAssociatedEvents(irs) {
    var allAssociatedEvents = new tr.model.EventSet();
    irs.forEach(function(ir) {
      ir.associatedEvents.forEach(function(event) {
        // FlowEvents don't have parentContainers or cpuDurations, and it's
        // annoying to highlight them.
        if (event instanceof tr.model.FlowEvent)
          return;
        allAssociatedEvents.push(event);
      });
    });
    return allAssociatedEvents;
  }

  function getUnassociatedEvents(model, associatedEvents) {
    var unassociatedEvents = new tr.model.EventSet();
    model.getAllProcesses().forEach(function(process) {
      for (var tid in process.threads) {
        var thread = process.threads[tid];
        thread.sliceGroup.iterateAllEvents(function(event) {
          // The set of unassociated events contains only events that are not in
          // the set of associated events.
          // Only add event to the set of unassociated events if it is not in
          // the set of associated events.
          if (!associatedEvents.contains(event))
            unassociatedEvents.push(event);
        });
      }
    });
    return unassociatedEvents;
  }

  function getTotalCpuDuration(events) {
    var cpuMs = 0;
    events.forEach(function(event) {
      // Add up events' cpu self time if they have any.
      if (event.cpuSelfTime)
        cpuMs += event.cpuSelfTime;
    });
    return cpuMs;
  }

  function getIRCoverageFromModel(model) {
    var associatedEvents = getAssociatedEvents(model.interactionRecords);

    if (!associatedEvents.length)
      return undefined;

    var unassociatedEvents = getUnassociatedEvents(
        model, associatedEvents);

    var associatedCpuMs = getTotalCpuDuration(associatedEvents);
    var unassociatedCpuMs = getTotalCpuDuration(unassociatedEvents);

    var totalEventCount = associatedEvents.length + unassociatedEvents.length;
    var totalCpuMs = associatedCpuMs + unassociatedCpuMs;

    return {
      associatedEventsCount: associatedEvents.length,
      unassociatedEventsCount: unassociatedEvents.length,
      associatedEventsCpuTimeMs: associatedCpuMs,
      unassociatedEventsCpuTimeMs: unassociatedCpuMs,
      coveredEventsCountRatio: associatedEvents.length / totalEventCount,
      coveredEventsCpuTimeRatio: associatedCpuMs / totalCpuMs
    };
  }

  return {
    getIRCoverageFromModel: getIRCoverageFromModel,
    getAssociatedEvents: getAssociatedEvents,
    getUnassociatedEvents: getUnassociatedEvents
  };
});
