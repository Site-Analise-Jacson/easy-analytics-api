import moment from 'moment-timezone';

export function parseHorarioToDate(input: string): Date | null {
    if (!input || typeof input !== "string") return null;

    // Aceita "HH:MM" ou "HH.MM"
    const normalized = input.replace(".", ":");

    const [hoursStr, minutesStr] = normalized.split(":");
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) return null;

    const now = new Date();

    const nowUtc = new Date(
        Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            now.getUTCHours(),
            now.getUTCMinutes(),
            now.getUTCSeconds(),
            now.getUTCMilliseconds()
        )
    );

    let resultDate = new Date(
        Date.UTC(
            nowUtc.getUTCFullYear(),
            nowUtc.getUTCMonth(),
            nowUtc.getUTCDate(),
            hours,
            minutes,
            0,
            0
        )
    );

    if (resultDate > nowUtc) {
        resultDate.setUTCDate(resultDate.getUTCDate() - 1);
    }

    return resultDate;
}

export function parseHorarioToDateBet365(input: string): Date | null {
    if (!input || typeof input !== "string") return null;

    const normalized = input.replace(".", ":");
    const [hoursStr, minutesStr] = normalized.split(":");

    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) return null;

    const now = new Date();

    // Build from UTC date parts to avoid local-time drift.
    let resultDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        hours,
        minutes,
        0,
        0
    ));

    // API time is Sao Paulo local (UTC-3), convert to UTC.
    resultDate.setUTCHours(resultDate.getUTCHours() + 3);

    // If the parsed hour lands in the future, it belongs to the previous day.
    if (resultDate > now) {
        resultDate.setUTCDate(resultDate.getUTCDate() - 1);
    }

    return resultDate;
}


export function parseHorarioToDatev2(input: string): Date | null {
    if (!input || typeof input !== "string") return null;

    const normalized = input.replace(".", ":");
    const [hoursStr, minutesStr] = normalized.split(":");
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) return null;

    // Cria a data no timezone de São Paulo
    let resultMoment = moment.tz({
        hour: hours,
        minute: minutes,
        second: 0,
        millisecond: 0,
        year: moment().year(),
        month: moment().month(),
        day: moment().date()
    }, "America/Sao_Paulo");

    // Se for no futuro (i.e., hora maior que a hora atual), subtrai um dia
    if (resultMoment.isAfter(moment.tz("America/Sao_Paulo"))) {
        resultMoment = resultMoment.subtract(1, 'day');
    }

    return resultMoment.toDate();
}