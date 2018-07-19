
window.addEventListener('DOMContentLoaded', main);

function main() {
    let model = createModel(),
        actions = createActions(model),


        view = createView();

    actions.resetModel();
    m.mount(document.body, view(model, actions));
}

function createModel() {
    return {
        lookup: {
            cultures: [{
                    name: 'English',
                    header: '<div width="100%" style="background-color:goldenrod;text-align:center"><span style="font-weight: bold;font-size: 20px;margin-left:20px">Welcome to Rally</span></div>'
                },
                {
                    name: 'French',
                    header: '<div width="100%" style="background-color:gold;text-align:center"><span style="font-weight: bold;font-size: 20px;margin-left:20px">Bienvenue au Rally</span></div>'
                },
                {
                    name: 'Germany',
                    header: '<div width="100%" style="background-color:orange;text-align:center"><span style="font-weight: bold;font-size: 20px;margin-left:20px">Willkommen bei Rally</span></div>'
                }
            ],
            busTypes: [{
                type: 1,
                name: 'Charter Bus',
                totalSeats: 55,
                threshold: 25
            }, {
                type: 2,
                name: 'Mini Bus',
                totalSeats: 32,
                threshold: 20
            }, {
                type: 3,
                name: 'School Bus',
                totalSeats: 44,
                threshold: 40
            }],
            tripStages: [{
                id: 1,
                name: 'Initial'
            }, {
                id: 2,
                name: 'UserRequested'
            }, {
                id: 3,
                name: 'NotEnoughInterest'
            }, {
                id: 7,
                name: 'LastBus'
            }, {
                id: 8,
                name: 'OverLimit'
            }, {
                id: 10,
                name: 'Confirmed'
            }, {
                id: 15,
                name: 'Limited'
            }]
        },

        selectedCulture: 'English',
        assignedBuses: 1, // #buses to assign explicitly,
        assignedBusesList: [],
        reservationsToAddRemove: 5, // must be atleast 1,
        tripDetails: {
            startDate: +new Date(),
            weeksToEvent: 6,
            selectedBusType: 1,
            selectedBusThresholdValue: 0,
            routedTrips: 0
        },
        timeline: {
            tripStartDate: 0,
            eventDate: 0,
            loosePackEndDate: 0,
            intervalList: [],
            currentDate: +new Date()
        },
        vm: {
            tripBusesInfo: {
                confirmedBusCount: 0,
                reservationsRequiredToConfirmNextBus: 0,
                details: []
            },
            tripStatus: {
                0: {
                    selectedTripStage: 0,
                    weekStartDate: 0,
                    weekEndDate: 0,
                    isLoosePack: true,
                    reservationsThisWeek: 0,
                    reservationsToDate: 0,
                    message: '',
                    details: []
                }
            }
        }
    }
}

function createActions(model) {
    return {
        resetModel,
        updateTripDetails,
        updateCurrentDate,
        updateWeeklyReservation,
        updateCulture
    }

    function resetModel() {
        resetTimeline();
        resetTripDetails();
        resetTripStatus();
        resetBusesInfo();
        resetAssignedBuses();
    }

    function updateTripDetails(param, value) {
        let mustResetModel = false;
        switch (param) {
            case 'startDate':
                mustResetModel = true;
                value && (model.tripDetails.startDate = +new Date(value));
                break;
            case 'weeksToEvent':
                mustResetModel = true;
                value = value && parseInt(value);
                (value && value > 0 &&
                    (model.tripDetails.weeksToEvent = value));
                break;
            case 'assignedBuses':
                value = value && parseInt(value);
                if (model.assignedBuses + value >= 0) {
                    model.assignedBuses += value;
                    value > 0 ?
                        model.assignedBusesList.push({
                            index: model.assignedBusesList.length,
                            busCapacity: getSelectedBusDetail().totalSeats
                        }) :
                        model.assignedBusesList.pop();
                }
                break;
            case 'assignedBusCapacity':
                var index = value.index,
                    busCapacity = parseInt(value.busCapacity) || 0;

                if (busCapacity >= 0) {
                    var assignedBus = model.assignedBusesList.filter(b => b.index == index)[0];
                    assignedBus.busCapacity = busCapacity && parseInt(busCapacity) || 0;
                }
                break;
            case 'reservationsToAddRemove':
                value = value && parseInt(value);
                (value >= 0 &&
                    (model.reservationsToAddRemove = value));
                break;
            case 'selectedTripStage':
                if (value.selectedTripStage) {
                    var tripId = value.tripId;
                    model.vm.tripStatus[tripId].selectedTripStage = value.selectedTripStage;
                }
                break;
            case 'selectedBusType':
                model.tripDetails.selectedBusType = value;
                model.tripDetails.selectedBusThresholdValue = model.lookup.busTypes.filter(bus => bus.type == value)[0].threshold;
                resetAssignedBuses();
                break;
            case 'selectedBusThresholdValue':
                value = value && parseInt(value);
                var busCapacity = getSelectedBusDetail().totalSeats;
                (value >= 0 && value <= busCapacity &&
                    (model.tripDetails.selectedBusThresholdValue = value));
                break;
            case 'removeAssignedBus':
                value = value && parseInt(value);
                var assignedBusIndex = model.assignedBusesList.findIndex(b => b.index == value);
                model.assignedBusesList.splice(assignedBusIndex, 1);
                model.assignedBusesList.filter(b => b.index > assignedBusIndex).forEach(b => {
                    b.index -= 1;
                });
                model.assignedBuses = model.assignedBusesList.length;
                break;
            case 'updateRoutedTrips':
                value = value && parseInt(value);
                if (model.tripDetails.routedTrips + value >= 0) {
                    model.tripDetails.routedTrips += value;
                    mustResetModel = true;
                }
                break;
            default:
                break;
        }

        mustResetModel ? resetModel() : updateTripStatus();
    }

    function updateCurrentDate(date) {
        model.timeline.currentDate = date;
        updateTripStatus();
    }

    function updateWeeklyReservation(date, counter, tripId) {
        let intervalList = model.timeline.intervalList.filter(reservation => reservation.tripId == tripId),
            reservationDetail = intervalList.filter(reservation => reservation.intervalDate == date)[0];
        if (reservationDetail && (reservationDetail.reservationCount + counter) >= 0) {
            reservationDetail.reservationCount += counter;
            (reservationDetail.intervalDate <= model.timeline.currentDate) && updateTripStatus();
        }
    }

    // helper methods
    function resetTimeline() {
        let timeline = model.timeline;
        timeline.tripStartDate = model.tripDetails.startDate;
        timeline.eventDate = new Date(timeline.tripStartDate).setDate(new Date(timeline.tripStartDate).getDate() + (model.tripDetails.weeksToEvent * 7));
        timeline.loosePackEndDate = new Date(timeline.eventDate).setDate(new Date(timeline.eventDate).getDate() - 14);
        timeline.currentDate = model.tripDetails.startDate;
        resetIntervalList();
    }

    function resetIntervalList() {
        model.timeline.intervalList = [];
        let weeksToEvent = parseInt(model.tripDetails.weeksToEvent) || 0,
            weekPeriod = 1000 * 60 * 60 * 24 * 7,
            nextIntervalDate = model.tripDetails.startDate;

        for (let index = weeksToEvent; index > 0; index--) {
            model.timeline.intervalList.push({
                intervalDate: nextIntervalDate,
                reservationCount: 0,
                tripId: 0
            })
            nextIntervalDate += weekPeriod;
        }

        for (let tripId = 1; tripId <= model.tripDetails.routedTrips; tripId++) {
            nextIntervalDate = model.tripDetails.startDate;
            for (let index = weeksToEvent; index > 0; index--) {
                model.timeline.intervalList.push({
                    intervalDate: nextIntervalDate,
                    reservationCount: 0,
                    tripId: tripId
                })
                nextIntervalDate += weekPeriod;
            }
        }
    }

    function resetTripStatus() {
        let tripStatus = model.vm.tripStatus;
        tripStatus[0].selectedTripStage = model.lookup.tripStages[0].id;
        tripStatus[0].weekStartDate = 0;
        tripStatus[0].weekEndDate = 0;
        tripStatus[0].isLoosePack = true;
        tripStatus[0].reservationsThisWeek = 0;
        tripStatus[0].reservationsToDate = 0;
        tripStatus[0].message = '';
        tripStatus[0].details = [];

        for (let tripId = 1; tripId <= model.tripDetails.routedTrips; tripId++) {
            tripStatus[tripId] = tripStatus[tripId] || {};
            tripStatus[tripId].selectedTripStage = model.lookup.tripStages[0].id;
            tripStatus[tripId].weekStartDate = 0;
            tripStatus[tripId].weekEndDate = 0;
            tripStatus[tripId].isLoosePack = true;
            tripStatus[tripId].reservationsThisWeek = 0;
            tripStatus[tripId].reservationsToDate = 0;
            tripStatus[tripId].message = '';
            tripStatus[tripId].details = [];
        }
    }

    function resetBusesInfo() {
        model.vm.tripBusesInfo.confirmedBusCount = 0;
        model.vm.tripBusesInfo.reservationsRequiredToConfirmNextBus = 0;
        model.vm.tripBusesInfo.details = [];
    }

    function resetAssignedBuses() {
        model.assignedBuses = 1;
        model.assignedBusesList.length = 0;
        model.assignedBusesList.push({
            index: 0,
            busCapacity: getSelectedBusDetail().totalSeats
        })
    }

    function resetTripDetails() {
        let tripDetails = model.tripDetails;
        tripDetails.selectedBusThresholdValue = model.lookup.busTypes.filter(bus => bus.type == tripDetails.selectedBusType)[0].threshold;
    }

    function updateCulture(name) {
        model.selectedCulture = name;
    }

    function updateTripStatus() {
        for (let tripId in model.vm.tripStatus) {
            updateTripBusesInfo();

            let isLoosepack = isLoosePack(),
                reservationsCount = getReservationsToDate(),
                tripReservationsCount = getReservationsToDate(tripId),
                busThreshold = model.tripDetails.selectedBusThresholdValue || 0,
                availableSeatsCount = getAvailableSeats(),
                reservationsRequiredToConfirmNextBus = model.vm.tripBusesInfo.reservationsRequiredToConfirmNextBus,
                confirmedBusesCount = model.vm.tripBusesInfo.confirmedBusCount,
                exposeThresholds = true,
                tripStatus = model.vm.tripStatus[tripId];

            tripStatus.details = [];
            tripStatus.message = '';
            let tripStage = model.lookup.tripStages.filter(stage => stage.id == model.vm.tripStatus[tripId].selectedTripStage)[0];

            switch (tripStage.name) {
                case 'Limited':
                case 'Initial':
                    exposeThresholds && reservationsCount < busThreshold && (tripStatus.message = `${reservationsRequiredToConfirmNextBus} more needed to confirm!`);
                    exposeThresholds && reservationsCount >= busThreshold && (
                        tripStatus.message = `${reservationsCount} booked!`,
                        tripStatus.details.push("Pending review & confirmation"),
                        model.tripDetails.routedTrips > 0 && tripReservationsCount < 5 && tripStatus.details.push(`this stop needs ${5 - tripReservationsCount} more bookings in order to be confirmed`)
                    );
                    break;

                case 'Confirmed':
                    confirmedBusesCount = model.assignedBuses > confirmedBusesCount ? model.assignedBuses : confirmedBusesCount;
                    tripStatus.message =
                        exposeThresholds && `Confirmed for ${confirmedBusesCount || 1} bus(es)!`;

                    if (exposeThresholds) {
                        if (availableSeatsCount > 0) {
                            tripStatus.details.push(`${availableSeatsCount} seat(s) available`);
                        }
                        if (availableSeatsCount < 6) {
                            tripStatus.details.push(`${availableSeatsCount + busThreshold} more needed to confirm next bus`);
                        }
                    }
                    break;

                case 'LastBus':
                    tripStatus.message = "Confirmed!";
                    exposeThresholds &&
                        tripStatus.details.push(`${availableSeatsCount} seat(s) left on last bus`);
                    break;

                case 'NotEnoughInterest':
                    tripStatus.message = "Cancelled due to lack of interest!";
                    break;
                case 'OverLimit':
                    tripStatus.message = "Confirmed!";
                    tripStatus.details.push("No more seat available");
                    break;
                case 'UserRequested':
                    tripStatus.message = `${reservationsCount} booked!`;
                    tripStatus.details.push("Pending review & confirmation");
                    tripStatus.details.push("Rider requested");
                    break;
                default:
                    break;
            }
            tripStatus.weekStartDate = +new Date(getCurrentWeekDates().startDate);
            tripStatus.weekEndDate = +new Date(getCurrentWeekDates().endDate);
            tripStatus.isLoosePack = !!isLoosepack;
            tripStatus.reservationsToDate = tripReservationsCount;
        }
    }

    function getCurrentWeekDates() {
        let previousDates = model.timeline.intervalList.filter(details => model.timeline.currentDate >= details.intervalDate);
        let comingDates = model.timeline.intervalList.filter(details => model.timeline.currentDate < details.intervalDate);

        return {
            startDate: previousDates.length > 0 && previousDates.reverse()[0].intervalDate,
            endDate: (comingDates.length > 0 && comingDates[0].intervalDate) || model.timeline.eventDate
        }
    }

    function updateTripBusesInfo() {
        resetBusesInfo();

        let tripBusesInfo = model.vm.tripBusesInfo,
            reservationCount = getReservationsToDate(),
            busDetail = getSelectedBusDetail(),
            busThreshold = model.tripDetails.selectedBusThresholdValue,
            asssignSeatsPerBus = isLoosePack() ? busThreshold : busDetail.totalSeats,
            tripBusesDetails = getTripBusesDetails(),
            confirmedBuses = tripBusesDetails.confirmedBuses,
            unconfimedReservations = tripBusesDetails.unconfimedReservations;

        for (let index = 0; index < confirmedBuses; index++) {
            tripBusesInfo.details.push({
                total: busDetail.totalSeats,
                seatsBooked: isLoosePack() ? asssignSeatsPerBus : ((model.assignedBusesList[0] && model.assignedBusesList[0].busCapacity) || asssignSeatsPerBus)
            })
        }

        unconfimedReservations > 0 && tripBusesInfo.details.push({
            total: busDetail.totalSeats,
            seatsBooked: unconfimedReservations
        });

        tripBusesInfo.confirmedBusCount = confirmedBuses + (unconfimedReservations / busThreshold >= 1 ? 1 : 0);
        if (!isLoosePack() && unconfimedReservations == 0) {
            tripBusesInfo.reservationsRequiredToConfirmNextBus = 0;
        } else {
            tripBusesInfo.reservationsRequiredToConfirmNextBus = (busThreshold - unconfimedReservations);
        }
    }

    function getTripBusesDetails() {
        let reservations = getReservationsToDate(),
            busThreshold = model.tripDetails.selectedBusThresholdValue,
            result = {
                confirmedBuses: 0,
                unconfimedReservations: 0
            };

        if (isLoosePack()) {
            result.confirmedBuses = parseInt(reservations / busThreshold);
            result.unconfimedReservations = reservations % busThreshold;
        } else {
            model.assignedBusesList.forEach(assignedBus => {
                if (assignedBus.busCapacity <= reservations) {
                    result.confirmedBuses += 1;
                    reservations -= assignedBus.busCapacity;
                }
            });
            result.unconfimedReservations = reservations;
        }

        return result;
    }

    function isLoosePack() {
        return model.timeline.currentDate <= model.timeline.loosePackEndDate;
    }

    function getAvailableSeats() {
        let reservationsToDate = getReservationsToDate(),
            busCapacity = getSelectedBusDetail().totalSeats,
            assignBusesCapacity = model.assignedBusesList.reduce((acc, record) => acc += record.busCapacity, 0),
            availableSeats = 0;

        if (assignBusesCapacity >= reservationsToDate) {
            availableSeats = assignBusesCapacity - reservationsToDate;
        } else {
            availableSeats = (parseInt(reservationsToDate / busCapacity) + (reservationsToDate % busCapacity == 0 ? 0 : 1)) * busCapacity - reservationsToDate;
        }
        return availableSeats;
    }

    function getReservationsThisWeek(tripId) {
        return model.timeline.intervalList.filter(reservation =>
            reservation.intervalDate <= model.timeline.currentDate).reverse()[0].reservationCount;
    }

    function getReservationsToDate(tripId) {
        let totalReservations = 0,
            intervalList = tripId == undefined ? model.timeline.intervalList : model.timeline.intervalList.filter(reservation => reservation.tripId == tripId);

        for (let index in intervalList) {
            let reservationDetails = intervalList[index];
            if (reservationDetails.intervalDate <= model.timeline.currentDate) {
                totalReservations += reservationDetails.reservationCount;
            }
        }

        return totalReservations;
    }

    function getSelectedBusDetail() {
        return model.lookup.busTypes.filter(bus => bus.type == model.tripDetails.selectedBusType)[0]
    }
}

function createView() {
    return vwApp;

    function vwApp(model, actions) {
        return {
            view: (vnode) => vwBody(model, actions)
        }
    }

    function vwBody(model, actions) {
        return m("div.vwBody",
            m('.row',
                vwHeader(model, actions),
                vwForm(model, actions)
            ),
            m('.row',
                vwGraph(model, actions, 0),
                Array(model.tripDetails.routedTrips).fill().map((data, index) => vwGraph(model, actions, index + 1)),
                vwBusLine(model, actions),
                m("br"),
                vwTimeline(model, actions),
            )
        )
    }

    function vwHeader(model, actions) {
        let currentCulture = model.lookup.cultures.filter(culture => culture.name == model.selectedCulture)[0];
        return m(".row", m.trust(currentCulture.header))
    }

    function vwGraph(model, actions, tripId) {
        let barChartWidth = 910,
            barChartMargin = 30,
            pluMinusButtonWidth = 48,
            distanceBetweenWeeklyReservations = ((barChartWidth - barChartMargin) / (model.tripDetails.weeksToEvent)) - pluMinusButtonWidth,
            firstReservationPosition = barChartMargin + (distanceBetweenWeeklyReservations / 2),
            intervalList = model.timeline.intervalList.filter(reservation => reservation.tripId == tripId);

        return m('', {
                oncreate: () => createGraph(model, tripId),
                onupdate: () => updateGraphDetails(model, tripId)
            },
            m(".row",
                m(".col-sm-9",
                    m(".graph-view",
                        m("canvas[height='110'][width='600']", {
                            class: 'bar-chart',
                            id: 'bar-chart' + tripId
                        }),
                    ),
                    m('.reservation-slots', {
                            style: {
                                "position": "relative"
                            }
                        },
                        m("img[alt='Building image'][src='assets/building.png'][width='60px']", {
                            class: 'buildingImage'
                        }),
                        m("img[alt='event image'][src='assets/event.png']", {
                            class: 'eventImage'
                        }),
                        intervalList.map((reservation, index) => {
                            return m(".graph", {
                                    style: {
                                        'margin-left': (index == 0 ? firstReservationPosition : distanceBetweenWeeklyReservations) + "px"
                                    }
                                },
                                m("input[type=button]", {
                                    onclick: () => actions.updateWeeklyReservation(reservation.intervalDate, model.reservationsToAddRemove * -1, tripId),
                                    value: '-'
                                }),
                                m("input[type=button]", {
                                    onclick: () => actions.updateWeeklyReservation(reservation.intervalDate, model.reservationsToAddRemove, tripId),
                                    value: '+'
                                })
                            )
                        })),
                    // model.tripDetails.routedTrips > 0 && m("hr", {
                    //     style: {
                    //         "border-top": "1px solid black",
                    //         width: "132%"
                    //     }
                    // })
                ),
                m(".col-sm-3", {
                    style: {
                        'margin-top': '5px'
                    }
                }, vwTrip(model, actions, tripId))
            )
        )
    }

    function vwForm(model, actions) {
        return m(".row.well", {
                style: {
                    'margin-bottom': '0px',
                    'padding': '0px'
                }
            },
            m(".col-sm-1"),
            m(".vwForm.col-sm-11",
                m(".mrt-10.flex-container.row",
                    m(".col-sm-4",
                        m("label.col", "Start Date : "),
                        m("input.input.col", {
                            style: {
                                "margin-left": "42px"
                            },
                            type: "date",
                            placeholder: "Start Date",
                            value: getUIDate(model.tripDetails.startDate),
                            onchange: m.withAttr('value', (value) => actions.updateTripDetails('startDate', value))
                        }),
                    ),
                    m(".col-sm-4",
                        m("label.col", {
                            style: {
                                "margin-left": "20px"
                            }
                        }, "#Weeks To Event: "),
                        m("input.input.col", {
                            style: {
                                "margin-left": "29px"
                            },
                            type: "number",
                            placeholder: "Week From Now",
                            value: model.tripDetails.weeksToEvent,
                            oninput: m.withAttr('value', (value) => actions.updateTripDetails('weeksToEvent', value))
                        }),
                    ),
                    m(".col-sm-4",
                        m("label.col", {
                            style: {
                                "margin-left": "50px"
                            }
                        }, "Bus Types : "),
                        m("select.input.col", {
                                style: {
                                    "margin-left": "20px"
                                },
                                onchange: m.withAttr('value', (value) => actions.updateTripDetails('selectedBusType', value))
                            },
                            model.lookup.busTypes.map(trip => {
                                return m('option', {
                                    value: trip.type
                                }, trip.name)
                            })
                        )
                    )
                ),
                m(".mrt-10.flex-container.row",
                    m(".col-sm-4",
                        m("label.col", "Bus Threshold : "),
                        m("input.input[type=number].col", {
                            style: {
                                "margin-left": "10px"
                            },
                            oninput: m.withAttr('value', (value) => actions.updateTripDetails('selectedBusThresholdValue', value)),
                            value: model.tripDetails.selectedBusThresholdValue && parseInt(model.tripDetails.selectedBusThresholdValue) || 0
                        }),
                    ),
                    m(".col-sm-4",
                        m("label.col", {
                            style: {
                                "margin-left": "20px"
                            }
                        }, "Reservations Count: "),
                        m("input.input[type=number]", {
                            style: {
                                "margin-left": "10px"
                            },
                            oninput: m.withAttr('value', (value) => actions.updateTripDetails('reservationsToAddRemove', value)),
                            value: model.reservationsToAddRemove && parseInt(model.reservationsToAddRemove) || 0
                        }),
                    ),
                    m(".col-sm-4",
                        m("label.col", {
                            style: {
                                "margin-left": "50px"
                            }
                        }, "Routed Trips: "),
                        //m("span", model.tripDetails.routedTrips),
                        m("input[type=button]", {
                            style: {
                                "margin-left": "10px"
                            },
                            onclick: () => actions.updateTripDetails('updateRoutedTrips', -1),
                            value: '-'
                        }),
                        m("input[type=text][disabled]", {
                            style: {
                                width: "25px"
                            },
                            class: "text-center",
                            value: model.tripDetails.routedTrips
                        }),
                        m("input[type=button]", {
                            onclick: () => actions.updateTripDetails('updateRoutedTrips', 1),
                            value: '+'
                        })
                    )
                ),
                m("br")
            )
        )
    }

    function vwTimeline(model, actions) {
        let timeline = model.timeline,
            startDate = getFormattedDate(timeline.tripStartDate),
            endDate = getFormattedDate(timeline.eventDate),
            barChartWidth = 915,
            barChartMargin = 3,
            distanceBetweenWeeklyReservations = (barChartWidth - barChartMargin) / (model.tripDetails.weeksToEvent),
            firstReservationPosition = barChartMargin + (distanceBetweenWeeklyReservations / 2),
            looselyPackEndDate = (((model.timeline.loosePackEndDate - model.timeline.tripStartDate) / (model.timeline.eventDate - model.timeline.tripStartDate)) * 840).toFixed(2) * 1;

        var selectedPoint = ((parseInt(model.timeline.currentDate) - model.timeline.tripStartDate) / (model.timeline.eventDate - model.timeline.tripStartDate)).toFixed(2);

        //TODO: name change
        let arr = [0];
        let diff = 100 / (model.tripDetails.weeksToEvent);
        let data = diff;
        while (arr.length < (model.tripDetails.weeksToEvent + 1)) {
            arr.push(data.toFixed(2) * 1);
            data += diff;
        }

        let colorPart = []
        let highlightWeek = []
        let currentHighlightIndex;
        let markTextUnderline = 'none';

        arr.forEach((data, index) => {
            //changes
            let point = selectedPoint * 100;
            if (arr[index] <= point && point < arr[index + 1]) {
                currentHighlightIndex = index + 1
            }
            let newColor = (index % 2 == 0) ? 'lightgray' : 'darkgray';
            colorPart[index] = `${newColor} ${index > 0 ? arr[index - 1] : 0}%, ${newColor} ${data}%`
            //changes
            let highlight = (currentHighlightIndex && (currentHighlightIndex == index)) ? 'black' : 'transparent';
            highlightWeek[index] = `${highlight} ${index > 0 ? arr[index - 1] : 0}%, ${highlight} ${data}%`
        })

        return m(".slider.mrt-20",
            m(".row", {
                    style: {
                        "margin-top": "-20px"
                    }
                },
                m(".col-sm-8",
                    m("input", {
                        class: "slider",
                        style: {
                            'margin-top': '-4px',
                            'margin-left': firstReservationPosition + 'px',
                            'outline': 'none',
                            '-webkit-appearance': 'none',
                            'height': '4px',
                            'padding': 0,
                            'background-image': `-moz-linear-gradient(to right, ${colorPart.toString()})`,
                            'background-image': `-webkit-linear-gradient(to right, ${colorPart.toString()})`,
                            'background-image': `-ms-linear-gradient(to right, ${colorPart.toString()})`,
                            'background-image': `-o-linear-gradient(to right, ${colorPart.toString()})`,
                            'background-image': `linear-gradient(to right, ${colorPart.toString()})`
                        },
                        id: "addCss",
                        type: "range",
                        min: timeline.tripStartDate,
                        max: timeline.eventDate,
                        value: model.timeline.currentDate,
                        oninput: (event) => {
                            let eventObj = window.event || event;
                            eventObj && actions.updateCurrentDate(eventObj.target.value)
                        }
                    }),

                ),
                m(".col-sm-1", )
            ),
            //changes
            m(".row",
                m(".col-sm-9",
                    m("input", {
                        class: 'highlight-range',
                        style: {
                            'margin-left': firstReservationPosition + 'px',
                            'outline': 'none',
                            '-webkit-appearance': 'none',
                            'height': '2px',
                            'padding': 0,
                            'background-image': `-moz-linear-gradient(to right, ${highlightWeek.toString()})`,
                            'background-image': `-webkit-linear-gradient(to right, ${highlightWeek.toString()})`,
                            'background-image': `-ms-linear-gradient(to right, ${highlightWeek.toString()})`,
                            'background-image': `-o-linear-gradient(to right, ${highlightWeek.toString()})`,
                            'background-image': `linear-gradient(to right, ${highlightWeek.toString()})`
                        },
                        id: "addCss",
                        type: "range",
                        min: timeline.tripStartDate,
                        max: timeline.eventDate,
                        value: model.timeline.currentDate,
                    }),
                )
            ),
            m(".row", m(".col-sm-11", {
                    class: 'timeLinelmt'
                }, m("label", {
                        style: {
                            'position': 'absolute',
                            'margin-left': `${looselyPackEndDate + firstReservationPosition - 140}px`,
                            'opacity': (parseInt(model.timeline.currentDate) > model.timeline.loosePackEndDate) ? 0.3 : 1,
                            'color': (parseInt(model.timeline.currentDate) > model.timeline.loosePackEndDate) ? 'black' : 'darkviolet'
                        }
                    },
                    "<<---- Loosepack ----"),
                m("span.glyphicon.glyphicon-arrow-up", {
                    style: {
                        'position': 'absolute',
                        'margin-left': `${looselyPackEndDate + firstReservationPosition + 5}px`,

                    }
                }),
                m("label", {
                        style: {
                            'position': 'absolute',
                            'margin-left': `${looselyPackEndDate + firstReservationPosition + 30}px`,
                            'opacity': (parseInt(model.timeline.currentDate) > model.timeline.loosePackEndDate) ? 1 : 0.3,
                            'color': (parseInt(model.timeline.currentDate) > model.timeline.loosePackEndDate) ? 'darkviolet' : 'black'
                        }
                    },
                    "---- Tightpack ---->>"),

            )),
            m(".row",
                m(".col-sm-1"),
                m(".col-sm-1", {
                        class: 'timeLinelmt'
                    },
                    m("span", {
                        style: {
                            "margin-left": "-55px"
                        }
                    }, startDate),
                ),
                m(".col-sm-6"),
                m(".col-sm-1",
                    m("span", {
                        class: "endDate"
                    }, endDate)
                ),
            )
        )
    }

    function vwBusLine(model, actions) {
        let barChartWidth = 915,
            barChartMargin = 3,
            distanceBetweenWeeklyReservations = (barChartWidth - barChartMargin) / (model.tripDetails.weeksToEvent),
            firstReservationPosition = barChartMargin + (distanceBetweenWeeklyReservations / 2);

        return m('.busline.mrt-20', {
                style: {
                    'margin-left': firstReservationPosition + 'px'
                }
            },
            m(".row", [
                m(".col-sm-2", {
                        class: 'busLinelmt'
                    },
                    m("input[type=button]", {
                        class: "busLininput",
                        onclick: () => {
                            actions.updateTripDetails('assignedBuses', -1)
                        },
                        value: '-'
                    }),
                    m("input[type=button]", {
                        class: "busLininputBtn",
                        onclick: () => {
                            actions.updateTripDetails('assignedBuses', 1)

                        },
                        value: '+'
                    }),
                    m('span', {
                        class: "busLineSpan"
                    }, model.assignedBuses)
                ),
                m(".col-sm-8",
                    m(".assignedBuses", {
                            style: {
                                //display: "flex"
                            }
                        }, model.assignedBusesList.map((assignedBus, index) =>
                            m(".col-sm-1", {
                                    class: "busLineCol"
                                },
                                m(".assignedBusList",
                                    m("input[type=number]", {
                                        class: "assignedBusListInput",
                                        oninput: m.withAttr('value', (value) => actions.updateTripDetails('assignedBusCapacity', {
                                            index: assignedBus.index,
                                            busCapacity: value
                                        })),
                                        value: assignedBus.busCapacity
                                    }),
                                    m("a.boxclose[id='boxclose']", {
                                        onclick: () => actions.updateTripDetails('removeAssignedBus', assignedBus.index)
                                    }),
                                    m("div", {
                                            class: "busLinediv"
                                        },
                                        m("img[alt='Bus image'][src='assets/bus.png']", {
                                            class: "busImage"
                                        }),
                                        m("label", {
                                                class: "busSpan"
                                            },
                                            getAssignedBusReservation(model, index))),
                                ))
                        ), !areAllTripStagesInitial(model) && model.vm.tripBusesInfo.confirmedBusCount > model.assignedBuses &&
                        m(".col-sm-1", {
                                class: "elmntStyle"
                            },
                            m(".assignedBusList",
                                m("span", {
                                        class: "assignedBusListSpan"
                                    },
                                    // `${model.vm.tripBusesInfo.confirmedBusCount} [${model.assignedBuses} + ${model.vm.tripBusesInfo.confirmedBusCount - model.assignedBuses}]`
                                ),
                                m("img[alt='Bus image'][src='assets/lightgreen.png']", {
                                    class: "lightgreenImage"
                                }),
                                m("label", {
                                        class: "assignedBusListLabel"
                                    },
                                    getUnassignedBusReservationStatus(model, model.assignedBuses)
                                )
                            )
                        ), !areAllTripStagesInitial(model) && (model.vm.tripBusesInfo.confirmedBusCount >= model.assignedBuses) && model.vm.tripBusesInfo.reservationsRequiredToConfirmNextBus > 0 &&
                        m(".col-sm-1", {
                                class: "elmntStyle"
                            },
                            m(".assignedBusList",
                                m("span", {
                                    class: "assigneBuslistspan"
                                }),
                                m("img[alt='Bus image'][src='assets/greybus.png']", {
                                    class: "greybusImage"
                                }),
                                m("label", {
                                        class: "greybuslabel"
                                    },
                                    m('span', model.tripDetails.selectedBusThresholdValue - model.vm.tripBusesInfo.reservationsRequiredToConfirmNextBus,
                                        `(${model.vm.tripBusesInfo.reservationsRequiredToConfirmNextBus})`)
                                )
                            )
                        )
                    ))
            ])
        )
    }

    function areAllTripStagesInitial(model) {
        let isTripStageInitial = true;
        for (let tripId in model.vm.tripStatus) {
            isTripStageInitial = isTripStageInitial && (model.vm.tripStatus[tripId].selectedTripStage == 1); // 1 == TripStage.Initial
        }

        return isTripStageInitial;
    }

    function getAssignedBusReservation(model, busIndex) {
        let busStatus = model.vm.tripBusesInfo.details[busIndex];
        return (busStatus && busStatus.seatsBooked) || 0;
    }

    function getUnassignedBusReservationStatus(model, busIndex) {
        let unAssignedBusSeats = 0,
            unAssignedBusStatus = '',
            isLoosePack = model.vm.tripStatus[0].isLoosePack,
            busCapacity = isLoosePack ? model.tripDetails.selectedBusThresholdValue : model.vm.tripBusesInfo.details[0].total;

        model.vm.tripBusesInfo.details.forEach((bus, index) => {
            if (index >= busIndex) {
                unAssignedBusSeats += bus.seatsBooked;
            }
        })

        if (isLoosePack) {
            unAssignedBusStatus = `${parseInt(unAssignedBusSeats / busCapacity)}*${busCapacity}`;
        } else {
            unAssignedBusSeats >= busCapacity && (unAssignedBusStatus += `${parseInt(unAssignedBusSeats / busCapacity)}*${busCapacity}`);
            unAssignedBusSeats % busCapacity >= model.tripDetails.selectedBusThresholdValue &&
                (
                    unAssignedBusStatus = unAssignedBusStatus.length > 0 ? unAssignedBusStatus + '+' : unAssignedBusStatus,
                    unAssignedBusStatus += `${unAssignedBusSeats % busCapacity}`
                );
        }

        return unAssignedBusStatus;
    }

    function vwTrip(model, actions, tripId) {
        let tripStatus = model.vm.tripStatus[tripId],
            selectedBusDetail = model.lookup.busTypes.filter(bus => bus.type == model.tripDetails.selectedBusType)[0];

        return m('', {
                style: {
                    height: "184px",
                    "font-size": "12px"
                },
                class: "well"
            },
            m('label', 'Rally Point - ', tripId + 1),
            m(".trip",
                m('li', m('u', 'Trip Stage'), ': ', m("select.input.col", {
                        onchange: m.withAttr('value', (value) => actions.updateTripDetails('selectedTripStage', {
                            tripId: tripId,
                            selectedTripStage: value
                        }))
                    },
                    model.lookup.tripStages.map(trip => {
                        return m('option', {
                            value: trip.id,
                            selected: model.vm.tripStatus[tripId].selectedTripStage == trip.id
                        }, trip.name)
                    })
                )),
                m('li', m('u', 'Week Ending'), ': ', tripStatus.weekEndDate && new Date(tripStatus.weekEndDate).toLocaleDateString()),
                m('li', m('u', 'Loose Pack'), ': ', tripStatus.isLoosePack.toString()),
                m('li', m('u', 'Reservations To Date'), ': ', tripStatus.reservationsToDate),
                m('li', m('u', 'Bus Capacity/Threshold'), ': ', (selectedBusDetail.totalSeats + '/' + model.tripDetails.selectedBusThresholdValue)),

            ),
            m('', {
                    class: "vwtripStyle"
                }, tripStatus.message && (tripStatus.message + ' '),
                tripStatus.details.length > 0 && tripStatus.details.map((detail, index) => m('span', detail + (tripStatus.details.length > (index + 1) ? ',' : '.')))
            ),
            m('br'),
        )
    }

    function getFormattedDate(timestamp) {
        if (timestamp && parseInt(timestamp)) {
            timestamp = parseInt(timestamp);
            return new Date(timestamp).toLocaleDateString();
        }
    }

    function getUIDate(timestamp) {
        if (timestamp && parseInt(timestamp)) {
            timestamp = parseInt(timestamp);
            let date = new Date(timestamp);
            return date.toISOString().split('T')[0]
        }
    }

    function createGraph(model, tripId) {
        let intervalList = model.timeline.intervalList.filter(reservation => reservation.tripId == tripId),
            reservationsPerWeekList = intervalList.map(reservation => reservation.reservationCount),
            dates = intervalList.map(reservation => getFormattedDate(reservation.intervalDate));

        window['bar_chart' + tripId] = new Chart(document.getElementById('bar-chart' + tripId), {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [{
                    label: '#Reservations to date',
                    data: reservationsPerWeekList,
                    backgroundColor: "#FFA000",
                    hoverBackgroundColor: "#FFCA28",
                    hoverBorderWidth: 0
                }]
            },
            options: {
                animation: {
                    duration: 10,
                },
                scales: {
                    xAxes: [{
                        stacked: true,
                        gridLines: {
                            display: false
                        },
                        barPercentage: 0.3
                    }],
                    yAxes: [{
                        stacked: true,
                        ticks: {
                            max: 70,
                            display: false,
                            callback: function (value) {},
                        },
                    }],
                }, // scales
                legend: {
                    labels: {
                        boxWidth: 10
                    },
                    display: true
                },
                plugins: {
                    datalabels: {
                        display: true,
                        align: 'center',
                        anchor: 'center',
                        font: {
                            size: 15,
                            weight: 700
                        },
                    }
                },
            } // options
        });
    }

    function updateGraphDetails(model, tripId) {
        let intervalList = model.timeline.intervalList.filter(reservation => reservation.tripId == tripId),
            reservationsPerWeekList = intervalList.map(reservation => reservation.reservationCount),
            dates = intervalList.map(reservation => getFormattedDate(reservation.intervalDate));
        //changes
        let backgroundColor = [];
        intervalList.forEach((reservation, index) => {
            backgroundColor.push('lightgrey');
            if (model.vm.tripStatus[0].weekStartDate >= reservation.intervalDate) {
                backgroundColor[index] = 'orange';
            }
        });

        let bar_chart = 'bar_chart' + tripId;
        if (window[bar_chart]) {
            window[bar_chart].data.labels = dates;
            window[bar_chart].data.datasets[0].data = reservationsPerWeekList;
            window[bar_chart].data.datasets[0].backgroundColor = backgroundColor;
            window[bar_chart].update();
        }
    }
}
