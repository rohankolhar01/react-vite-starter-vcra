function postAlienEncounter() {
    debugger;
    var city = $("#city-post-input").val();
    $.ajax({
        url: "/alien",
        type: "post",
        contentType: "application/json",
        data: JSON.stringify({
            "city_name": city
        }),
        success: function (data) {
            alert(data.message);
        },
        error: function (error) {
            alert(error.message);
        }
    });
}
function getAlienEncounter() {
    debugger
    showLoader();
    var positive = "https://media.giphy.com/media/Y1GYiLui9NHcxVKhdo/giphy.gif";
    var negative = "https://media.giphy.com/media/fsPcMdeXPxSP6zKxCA/giphy.gif";
    var city = $("#city-get-input").val();
    $.ajax({
        url: "/alien?city_name=" + city,
        type: "get",
        success: function (data) {
            console.log(data);
            $("#result-text").text("");
            $("#result-text").text(data.message);
            var imagesrc = negative;
            if (data.signal == 'positive') {
                imagesrc = positive;
            }
            $("#result-image").html("");
            $("#result-image").html("<img src='" + imagesrc + "' />");
            hideLoader();
        },
        error: function (error) {
            alert(error.message);
        }
    });
}
function showLoader()
{
    $("#result-container").hide();
    $("#loader").show();
}
function hideLoader()
{
    $("#loader").hide();
    $("#result-container").show();
}